/**
 * /admin/revenue-gate-audit
 * Real $1 Stripe test cockpit — captures before/after visibility snapshot,
 * watches for the webhook event, then runs 4 visibility checks.
 */
import { useEffect, useMemo, useState } from "react";
import SectionErrorBoundary from "@/components/admin/SectionErrorBoundary";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle, ExternalLink, RefreshCw } from "lucide-react";

type Snapshot = Record<string, unknown> | null;

const FIELDS = [
  "account_status",
  "activation_status",
  "onboarding_status",
  "is_published",
  "is_discoverable",
  "is_accepting_appointments",
  "published_at",
];

function fmt(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
}

function DiffRow({ k, before, after }: { k: string; before: unknown; after: unknown }) {
  const changed = fmt(before) !== fmt(after);
  return (
    <tr className={changed ? "bg-emerald-500/10" : ""}>
      <td className="py-2 pr-4 font-mono text-xs opacity-70">{k}</td>
      <td className="py-2 pr-4 font-mono text-xs">{fmt(before)}</td>
      <td className="py-2 pr-4 font-mono text-xs">
        {fmt(after)} {changed && <span className="ml-1 text-emerald-400">✓</span>}
      </td>
    </tr>
  );
}

export default function PageAdminRevenueGateAudit() {
  const [contractorId, setContractorId] = useState("");
  const [before, setBefore] = useState<Snapshot>(null);
  const [after, setAfter] = useState<Snapshot>(null);
  const [webhook, setWebhook] = useState<any | null>(null);
  const [checks, setChecks] = useState<Record<string, boolean | null>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  const snapshot = async (phase: "before" | "after") => {
    setError(null);
    setLoading(phase);
    try {
      const { data, error } = await supabase.functions.invoke("revenue-gate-snapshot", {
        body: { contractor_id: contractorId, phase },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const snap = (data as any).snapshot;
      if (phase === "before") setBefore(snap);
      else setAfter(snap);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  };

  // Poll the audit table for a recent webhook event tied to this contractor
  useEffect(() => {
    if (!polling || !contractorId) return;
    let cancelled = false;
    const tick = async () => {
      const { data } = await supabase
        .from("stripe_webhook_events")
        .select("*")
        .eq("contractor_id", contractorId)
        .order("received_at", { ascending: false })
        .limit(1);
      if (cancelled) return;
      if (data && data.length > 0) {
        setWebhook(data[0]);
        if (data[0].processed_at) {
          setPolling(false);
          // Auto snapshot AFTER + run visibility checks
          await snapshot("after");
          await runVisibilityChecks();
        }
      }
    };
    const id = setInterval(tick, 3000);
    tick();
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polling, contractorId]);

  const runVisibilityChecks = async () => {
    const results: Record<string, boolean | null> = { search: null, alex: null, reco: null, url: null };

    // 1. Search via contractors-api (best-effort; treat any hit as pass)
    try {
      const { data } = await supabase.functions.invoke("contractors-api", {
        body: { contractor_id: contractorId },
      });
      results.search = !!(data && (Array.isArray(data) ? data.length : (data as any).id));
    } catch {
      results.search = false;
    }

    // 2. Alex matching
    try {
      const { data } = await supabase.functions.invoke("alex-best-match-select", {
        body: { contractor_id_hint: contractorId },
      });
      const list = (data as any)?.matches ?? (data as any)?.results ?? [];
      results.alex = Array.isArray(list) ? list.some((m: any) => m?.id === contractorId || m?.contractor_id === contractorId) : false;
    } catch {
      results.alex = false;
    }

    // 3. Homeowner recommendations — re-use alex-best-match-select without hint as proxy
    try {
      const { data } = await supabase.functions.invoke("alex-best-match-select", {
        body: {},
      });
      const list = (data as any)?.matches ?? (data as any)?.results ?? [];
      results.reco = Array.isArray(list) && list.length > 0;
    } catch {
      results.reco = false;
    }

    // 4. Public URL
    try {
      const slug = (after as any)?.slug || (before as any)?.slug;
      if (slug) {
        const r = await fetch(`/entrepreneur/${slug}`, { method: "GET" });
        results.url = r.ok;
      } else {
        results.url = null;
      }
    } catch {
      results.url = false;
    }

    setChecks(results);
  };

  const startTest = async () => {
    if (!contractorId) return;
    setBefore(null);
    setAfter(null);
    setWebhook(null);
    setChecks({});
    await snapshot("before");
    setPolling(true);
    window.open(`/pro/${contractorId}`, "_blank"); // admin manually completes checkout
  };

  const verdict = useMemo(() => {
    if (!after) return null;
    const okActivation =
      (after as any).is_published === true &&
      (after as any).is_discoverable === true &&
      !!(after as any).published_at;
    const okChecks = Object.values(checks).every((v) => v === true);
    if (okActivation && okChecks) return "REVENUE GATE OPEN";
    return "BLOCKED";
  }, [after, checks]);

  return (
    <div className="admin-theme min-h-screen bg-background text-foreground p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">Revenue Gate Audit — Real $1 Stripe Test</h1>
          <p className="text-sm opacity-70 mt-1">
            Captures before/after visibility, watches for the Stripe webhook event, and runs 4 downstream visibility checks.
          </p>
        </header>

        <SectionErrorBoundary title="Test cockpit" onRetry={() => window.location.reload()}>
          <div className="rounded-2xl border border-border p-4 space-y-3">
            <div className="flex gap-2">
              <input
                value={contractorId}
                onChange={(e) => setContractorId(e.target.value.trim())}
                placeholder="Contractor UUID"
                className="flex-1 rounded-lg bg-transparent border border-border px-3 py-2 font-mono text-xs"
              />
              <button
                onClick={startTest}
                disabled={!contractorId || loading !== null}
                className="rounded-lg bg-amber-400 text-black px-4 py-2 text-sm font-semibold disabled:opacity-40"
              >
                Start Real $1 Test
              </button>
              <button
                onClick={() => snapshot("after")}
                disabled={!contractorId}
                className="rounded-lg border border-border px-3 py-2 text-sm inline-flex items-center gap-1"
              >
                <RefreshCw className="w-4 h-4" /> Snapshot AFTER
              </button>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            {polling && (
              <p className="text-xs text-amber-400 inline-flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" /> Watching for webhook event…
              </p>
            )}
          </div>
        </SectionErrorBoundary>

        {(before || after) && (
          <SectionErrorBoundary title="Snapshot diff" onRetry={() => window.location.reload()}>
            <div className="rounded-2xl border border-border p-4 overflow-x-auto">
              <h2 className="text-sm font-semibold mb-2">Contractor visibility fields</h2>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="opacity-60 text-left text-xs">
                    <th className="py-1 pr-4">field</th>
                    <th className="py-1 pr-4">before</th>
                    <th className="py-1 pr-4">after</th>
                  </tr>
                </thead>
                <tbody>
                  {FIELDS.map((k) => (
                    <DiffRow key={k} k={k} before={(before as any)?.[k]} after={(after as any)?.[k]} />
                  ))}
                </tbody>
              </table>
            </div>
          </SectionErrorBoundary>
        )}

        {webhook && (
          <SectionErrorBoundary title="Webhook event" onRetry={() => window.location.reload()}>
            <div className="rounded-2xl border border-border p-4 space-y-1 text-sm">
              <div><span className="opacity-60">event id:</span> <span className="font-mono text-xs">{webhook.stripe_event_id}</span></div>
              <div><span className="opacity-60">type:</span> {webhook.event_type}</div>
              <div><span className="opacity-60">received:</span> {webhook.received_at}</div>
              <div><span className="opacity-60">processed:</span> {webhook.processed_at ?? "—"}</div>
              <div>
                <span className="opacity-60">success:</span>{" "}
                {webhook.success === true ? (
                  <CheckCircle2 className="inline w-4 h-4 text-emerald-400" />
                ) : webhook.success === false ? (
                  <XCircle className="inline w-4 h-4 text-red-400" />
                ) : (
                  "—"
                )}
              </div>
              {webhook.error_message && <div className="text-red-400">{webhook.error_message}</div>}
            </div>
          </SectionErrorBoundary>
        )}

        {Object.keys(checks).length > 0 && (
          <SectionErrorBoundary title="Visibility checks" onRetry={() => window.location.reload()}>
            <div className="rounded-2xl border border-border p-4 space-y-2">
              {(["search", "alex", "reco", "url"] as const).map((k) => (
                <div key={k} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{k}</span>
                  {checks[k] === true ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : checks[k] === false ? (
                    <XCircle className="w-4 h-4 text-red-400" />
                  ) : (
                    <span className="opacity-40 text-xs">n/a</span>
                  )}
                </div>
              ))}
              <button
                onClick={runVisibilityChecks}
                className="mt-2 text-xs underline opacity-70 inline-flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Re-run checks
              </button>
            </div>
          </SectionErrorBoundary>
        )}

        {verdict && (
          <div
            className={`rounded-2xl p-4 text-center text-lg font-bold ${
              verdict === "REVENUE GATE OPEN"
                ? "bg-emerald-500/15 text-emerald-300"
                : "bg-red-500/15 text-red-300"
            }`}
          >
            {verdict}
          </div>
        )}

        <div className="text-xs opacity-60 pt-4">
          <a href="/admin/revenue-path-audit" className="underline inline-flex items-center gap-1">
            Open Revenue Path Audit <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
