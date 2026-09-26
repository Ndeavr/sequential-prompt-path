import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Row = {
  check_key: string; label: string; status: "ok" | "problem" | "untested"; evidence: Record<string, unknown>;
  probable_cause: string | null; component: string | null; fix_applied: string | null;
  test_performed: string | null; next_blocker: string | null; checked_at: string;
};

const LABEL = { ok: "OK", problem: "Problème", untested: "Non testé" } as const;
const VARIANT = { ok: "default", problem: "destructive", untested: "secondary" } as const;

export default function PageAdminSystemStatus() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["system-status-checks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("system_status_checks" as any).select("*").order("sort_order");
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });
  const run = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("system-status-check", { body: {} });
      if (error || !data?.ok) throw new Error(data?.error ?? error?.message ?? "check_failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["system-status-checks"] }),
  });

  return (
    <main className="admin-theme min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">UNPRO System Status</h1>
            <p className="text-sm text-muted-foreground">Chaque statut provient d'une preuve réelle en base. Aucun envoi n'est déclenché.</p>
          </div>
          <Button onClick={() => run.mutate()} disabled={run.isPending}>{run.isPending ? "Vérification…" : "Revérifier"}</Button>
        </header>
        {run.error && <p className="text-sm text-destructive">{(run.error as Error).message}</p>}
        {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
        {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
        {data && data.length === 0 && <p className="text-sm text-muted-foreground">Aucune vérification encore. Cliquez « Revérifier ».</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {data?.map((r) => (
            <section key={r.check_key} className="rounded-2xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">{r.label}</h2>
                <Badge variant={VARIANT[r.status]}>{LABEL[r.status]}</Badge>
              </div>
              {r.probable_cause && <p className="text-sm"><b>Cause probable :</b> {r.probable_cause}</p>}
              {r.component && <p className="text-xs text-muted-foreground"><b>Concerné :</b> {r.component}</p>}
              {r.fix_applied && <p className="text-sm"><b>Correction :</b> {r.fix_applied}</p>}
              {r.test_performed && <p className="text-xs text-muted-foreground"><b>Test :</b> {r.test_performed}</p>}
              {r.next_blocker && <p className="text-sm"><b>Prochain blocage :</b> {r.next_blocker}</p>}
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer">Preuve</summary>
                <pre className="mt-1 whitespace-pre-wrap break-all">{JSON.stringify(r.evidence, null, 2)}</pre>
              </details>
              <p className="text-[11px] text-muted-foreground">Vérifié {new Date(r.checked_at).toLocaleString("fr-CA")}</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
