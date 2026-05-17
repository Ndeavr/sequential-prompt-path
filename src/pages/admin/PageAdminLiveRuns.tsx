/**
 * PageAdminLiveRuns — Cockpit for end-to-end acquisition runs.
 * URL: /admin/live-runs
 *
 * Resilience contract:
 * - Auth bootstrap via supabase.auth.getSession() (not gated on edge function).
 * - Admin validated via validateAdmin (cache + email allowlist + user_roles).
 * - List refresh tries `list-live-runs` first, falls back to direct table reads
 *   (admin RLS allows SELECT on live_acquisition_runs / acquisition_run_steps).
 * - Start ISR is NEVER blocked by a failed list refresh.
 */
import { Helmet } from "react-helmet-async";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { validateAdmin } from "@/lib/adminGuard";
import { useAuth } from "@/hooks/useAuth";

type Run = {
  id: string;
  prospect_id: string;
  campaign: string;
  status: string;
  metadata: any;
  created_at: string;
};

type Step = {
  id: string;
  run_id: string;
  step_key: string;
  step_order: number;
  status: string;
  logs: any[];
  completed_at: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  running: "bg-blue-500/20 text-blue-300",
  succeeded: "bg-emerald-500/20 text-emerald-300",
  failed: "bg-red-500/20 text-red-300",
  blocked: "bg-amber-500/20 text-amber-300",
};

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout ${ms}ms · ${label}`)), ms),
    ),
  ]);
}

type SyncMode = "idle" | "function" | "fallback" | "error";

export default function PageAdminLiveRuns() {
  const {
    user,
    isAuthenticated,
    isLoading: authLoading,
    roles,
    isAdmin: roleStoreAdmin,
  } = useAuth() as any;
  const [runs, setRuns] = useState<Run[]>([]);
  const [steps, setSteps] = useState<Record<string, Step[]>>({});
  const [openRunId, setOpenRunId] = useState<string | null>(null);
  const [adminPhone, setAdminPhone] = useState("");
  const [confirmPhone, setConfirmPhone] = useState("");
  const [starting, setStarting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMode, setSyncMode] = useState<SyncMode>("idle");
  const [auth, setAuth] = useState<{
    email?: string | null;
    userId?: string | null;
    isAdmin?: boolean;
    source?: string;
    error?: string;
  }>({});
  const [lastError, setLastError] = useState<string | null>(null);

  const userId = user?.id ?? null;
  const userEmail = user?.email ?? null;
  const authRoles = Array.isArray(roles) ? roles : [];
  const adminReady = auth.isAdmin === true;
  const knownAdmin = !!userId && (roleStoreAdmin || authRoles.includes("admin"));

  // ───── AUTH BOOTSTRAP ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    if (authLoading && !userId) {
      setAuth({});
      return;
    }

    if (!isAuthenticated || !userId) {
      setAuth({ error: "Pas de session active. Connectez-vous à /login d'abord." });
      return;
    }

    if (knownAdmin) {
      setAuth({ email: userEmail, userId, isAdmin: true, source: "user_roles" });
      return;
    }

    setAuth({ email: userEmail, userId, isAdmin: false });

    void (async () => {
      try {
        const result = await validateAdmin(userId, userEmail);
        if (cancelled) return;
        if (result.allowed) {
          setAuth({ email: userEmail, userId, isAdmin: true, source: result.source });
        } else {
          setAuth({
            email: userEmail,
            userId,
            isAdmin: false,
            error: (result as any).reason === "load_error" ? `Role check failed: ${(result as any).detail || ""}` : "Rôle admin requis.",
          });
        }
      } catch (e: any) {
        if (cancelled) return;
        setAuth({ error: e?.message || "Auth bootstrap failed" });
      }
    })();

    return () => { cancelled = true; };
  }, [authLoading, isAuthenticated, userId, userEmail, knownAdmin]);

  // ───── DIRECT TABLE FALLBACK (admin RLS allows SELECT) ─────────────
  const refreshViaTables = useCallback(async (): Promise<{ runs: Run[]; steps: Step[] }> => {
    const { data: rRows, error: rErr } = await supabase
      .from("live_acquisition_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (rErr) throw rErr;
    const runs = (rRows || []) as unknown as Run[];
    const ids = runs.map((r) => r.id);
    let stepRows: Step[] = [];
    if (ids.length) {
      const { data: sRows, error: sErr } = await supabase
        .from("acquisition_run_steps")
        .select("*")
        .in("run_id", ids)
        .order("step_order");
      if (sErr) throw sErr;
      stepRows = (sRows || []) as unknown as Step[];
    }
    return { runs, steps: stepRows };
  }, []);

  // ───── EDGE FUNCTION (preferred, fast-fail) ────────────────────────
  const refreshViaFunction = useCallback(async (): Promise<{ runs: Run[]; steps: Step[] }> => {
    const { data, error } = await withTimeout(
      supabase.functions.invoke("list-live-runs", { body: {} }) as Promise<any>,
      8000,
      "list-live-runs",
    );
    if (error) throw error;
    if (!data || data.error) throw new Error(data?.message || data?.error || "list-live-runs failed");
    return { runs: (data.runs || []) as Run[], steps: (data.steps || []) as Step[] };
  }, []);

  // ───── SAFE REFRESH: function first, fallback to tables ────────────
  const safeRefresh = useCallback(async () => {
    setSyncing(true);
    try {
      let result: { runs: Run[]; steps: Step[] };
      try {
        result = await refreshViaFunction();
        setSyncMode("function");
      } catch (fnErr: any) {
        console.warn("[live-runs] function refresh failed, falling back to tables:", fnErr?.message);
        result = await refreshViaTables();
        setSyncMode("fallback");
      }
      setRuns(result.runs);
      const grouped: Record<string, Step[]> = {};
      result.steps.forEach((row) => {
        (grouped[row.run_id] ||= []).push(row);
      });
      setSteps(grouped);
    } catch (e: any) {
      setSyncMode("error");
      setLastError(e?.message || String(e));
    } finally {
      setSyncing(false);
    }
  }, [refreshViaFunction, refreshViaTables]);

  // Trigger initial + realtime refresh AFTER admin validated
  useEffect(() => {
    if (!auth.isAdmin) return;
    safeRefresh();
    const ch = supabase
      .channel("live_runs_admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_acquisition_runs" }, safeRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "acquisition_run_steps" }, safeRefresh)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [auth.isAdmin, safeRefresh]);

  // ───── START ISR RUN (NEVER gated on list refresh) ─────────────────
  const startIsrRun = async () => {
    setStarting(true);
    setLastError(null);
    try {
      const { data, error } = await withTimeout(
        supabase.functions.invoke("run-live-acquisition", {
          body: { slug: "isolation-solution-royal", campaign: "isr_first_live_test" },
        }) as Promise<any>,
        45000,
        "run-live-acquisition",
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const runId = data?.run_id;
      toast.success(`Run prêt — ${runId?.slice(0, 8)}…`);
      console.groupCollapsed(`[live-run] ${runId}`);
      console.log(data);
      console.groupEnd();
      // Optimistic insert so UI shows the run even if refresh is slow.
      if (runId && !runs.some((r) => r.id === runId)) {
        setRuns((prev) => [
          {
            id: runId,
            prospect_id: data.prospect_id || "",
            campaign: "isr_first_live_test",
            status: "running",
            metadata: {
              slug: "isolation-solution-royal",
              landing_url: data.landing_url,
              sms_body: data.sms_preview,
              sms_to: data.sms_to,
            },
            created_at: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
      await safeRefresh();
    } catch (e: any) {
      const msg = e?.message || String(e);
      setLastError(msg);
      toast.error(msg);
    } finally {
      setStarting(false);
    }
  };

  const dryRun = async (run: Run) => {
    if (!adminPhone) return toast.error("Entrez votre numéro admin (+1...)");
    try {
      const { data, error } = await withTimeout(
        supabase.functions.invoke("approve-isr-sms", {
          body: { run_id: run.id, dry_run: true, admin_phone: adminPhone },
        }) as Promise<any>,
        20000,
        "approve-isr-sms",
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Dry-run envoyé à ${data.sent_to}${data.simulated ? " (simulé)" : ""}`);
    } catch (e: any) {
      toast.error(e?.message || "Dry-run échoué");
    }
  };

  const approveSend = async (run: Run) => {
    const target = run.metadata?.sms_to;
    if (!confirmPhone || confirmPhone !== target) {
      return toast.error(`Tapez exactement le numéro du prospect: ${target}`);
    }
    if (!confirm(`Envoyer un SMS RÉEL à ${target}?`)) return;
    try {
      const { data, error } = await withTimeout(
        supabase.functions.invoke("approve-isr-sms", {
          body: { run_id: run.id, dry_run: false, confirm_phone: confirmPhone },
        }) as Promise<any>,
        20000,
        "approve-isr-sms",
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`SMS envoyé — sid ${data.sid || "(simulé)"}`);
      await safeRefresh();
    } catch (e: any) {
      toast.error(e?.message || "Envoi échoué");
    }
  };

  const startCheckout = async (run: Run) => {
    try {
      const { data, error } = await withTimeout(
        supabase.functions.invoke("create-isr-promo-checkout", {
          body: { slug: run.metadata?.slug, run_id: run.id },
        }) as Promise<any>,
        20000,
        "create-isr-promo-checkout",
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      window.open(data.url, "_blank");
    } catch (e: any) {
      toast.error(e?.message || "Checkout échoué");
    }
  };

  const syncChip =
    syncMode === "function"
      ? { label: "Sync fonction OK", cls: "bg-emerald-500/20 text-emerald-300" }
      : syncMode === "fallback"
        ? { label: "Sync directe (fallback)", cls: "bg-amber-500/20 text-amber-300" }
        : syncMode === "error"
          ? { label: "Sync indisponible", cls: "bg-red-500/20 text-red-300" }
          : { label: "Sync en attente", cls: "bg-white/10 text-white/60" };

  return (
    <div className="min-h-screen bg-[#060B14] text-white p-6">
      <Helmet><title>Runs d'acquisition live — Admin UNPRO</title></Helmet>
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold">Runs d'acquisition live</h1>
            <p className="text-white/60 text-sm mt-1">Cockpit pipeline end-to-end · test live ISR</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {auth.email && (
                <Badge className="bg-white/10 text-white/70">
                  {auth.email}
                </Badge>
              )}
              {auth.isAdmin ? (
                <Badge className="bg-emerald-500/20 text-emerald-300">Admin validé{auth.source ? ` · ${auth.source}` : ""}</Badge>
              ) : auth.error ? (
                <Badge className="bg-red-500/20 text-red-300">{auth.error}</Badge>
              ) : (
                <Badge className="bg-white/10 text-white/60">Vérification…</Badge>
              )}
              <Badge className={syncChip.cls}>{syncChip.label}</Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={safeRefresh} disabled={syncing || !auth.isAdmin}>
              {syncing ? "Sync…" : "Réessayer la sync"}
            </Button>
            <Button onClick={startIsrRun} disabled={starting || !auth.isAdmin}>
              {starting ? "Démarrage…" : "Start ISR Live Run"}
            </Button>
          </div>
        </header>

        {lastError && (
          <Card className="bg-red-500/10 border-red-500/30 p-4 text-sm text-red-200 flex items-start justify-between gap-3">
            <pre className="whitespace-pre-wrap break-words flex-1">{lastError}</pre>
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(lastError); setLastError(null); }}>
              Copier &amp; fermer
            </Button>
          </Card>
        )}

        <Card className="bg-white/[0.04] border-white/10 p-4 space-y-3">
          <h2 className="font-semibold">Contrôles approbation SMS</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/60">Votre numéro admin (cible dry-run)</label>
              <Input
                placeholder="+15145551234"
                value={adminPhone}
                onChange={(e) => setAdminPhone(e.target.value)}
                className="bg-black/30 border-white/10"
              />
            </div>
            <div>
              <label className="text-xs text-white/60">Numéro prospect (tapez pour confirmer envoi réel)</label>
              <Input
                placeholder="+15142499522"
                value={confirmPhone}
                onChange={(e) => setConfirmPhone(e.target.value)}
                className="bg-black/30 border-white/10"
              />
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          {runs.length === 0 && (
            <Card className="bg-white/[0.04] border-white/10 p-8 text-center text-white/60">
              {auth.isAdmin ? `Aucun run pour l'instant. Cliquez "Start ISR Live Run".` : "En attente de validation admin…"}
            </Card>
          )}
          {runs.map((run) => {
            const open = openRunId === run.id;
            const rs = steps[run.id] || [];
            return (
              <Card key={run.id} className="bg-white/[0.04] border-white/10 p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{run.metadata?.slug || "(no slug)"}</h3>
                      <Badge className={STATUS_COLORS[run.status] || ""}>{run.status}</Badge>
                      <span className="text-xs text-white/40">{run.campaign}</span>
                    </div>
                    <p className="text-xs text-white/50 mt-1 truncate">
                      {run.metadata?.landing_url} · phone {run.metadata?.sms_to}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => setOpenRunId(open ? null : run.id)}>
                      {open ? "Masquer" : "Étapes"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => dryRun(run)}>
                      Dry-run SMS
                    </Button>
                    <Button size="sm" onClick={() => approveSend(run)}>
                      Approuver &amp; envoyer
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => startCheckout(run)}>
                      Checkout 1$
                    </Button>
                  </div>
                </div>

                {open && (
                  <div className="mt-4 space-y-2">
                    {rs.map((s) => (
                      <div key={s.id} className="flex items-start gap-3 text-sm">
                        <span className="w-6 text-white/40 text-right">{s.step_order + 1}.</span>
                        <span className="w-40 font-mono">{s.step_key}</span>
                        <Badge className={STATUS_COLORS[s.status] || ""}>{s.status}</Badge>
                        <span className="text-xs text-white/40">
                          {s.completed_at ? new Date(s.completed_at).toLocaleTimeString() : "—"}
                        </span>
                        {s.logs?.length > 0 && (
                          <details className="text-xs text-white/50 ml-auto">
                            <summary className="cursor-pointer">logs</summary>
                            <pre className="mt-1 max-w-md whitespace-pre-wrap break-words">
                              {JSON.stringify(s.logs[s.logs.length - 1], null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                    {run.metadata?.sms_body && (
                      <div className="mt-3 p-3 rounded bg-black/30 border border-white/10">
                        <div className="text-xs text-white/50 mb-1">Aperçu SMS (vers {run.metadata.sms_to})</div>
                        <pre className="text-xs whitespace-pre-wrap">{run.metadata.sms_body}</pre>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
