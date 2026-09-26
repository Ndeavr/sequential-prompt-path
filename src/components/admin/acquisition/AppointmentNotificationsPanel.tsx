/** Admin pipeline — contractor appointment notifications (real provider logs only). */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function AppointmentNotificationsPanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["appointment-notifications-report"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("contractor-appointment-notify", { body: { mode: "report" } });
      if (error || !data?.ok) throw new Error(data?.error ?? error?.message ?? "report_failed");
      return data as { summary: Record<string, number>; rows: any[] };
    },
    refetchInterval: 30_000,
  });
  const labels: Array<[string, string]> = [
    ["sent", "Envoyés"], ["delivered", "Livrés"], ["failed", "Échecs"], ["clicked", "Cliqués"],
    ["accepted", "Acceptés"], ["proposed", "Plages proposées"], ["declined", "Refusés"],
  ];
  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <h2 className="text-lg font-semibold">Avis de rendez-vous aux entrepreneurs</h2>
      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
      {data && (
        <>
          <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
            {labels.map(([k, l]) => (
              <div key={k} className="rounded-xl border border-border p-2 text-center">
                <p className="text-xl font-bold">{data.summary[k] ?? 0}</p>
                <p className="text-xs text-muted-foreground">{l}</p>
              </div>
            ))}
          </div>
          {data.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun avis envoyé pour l'instant.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-muted-foreground">
                  <th className="py-1">Entrepreneur</th><th>Canal</th><th>Destinataire</th><th>Statut</th><th>Clics</th><th>Réponse</th><th>Envoyé</th>
                </tr></thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="py-1">{r.contractors?.business_name ?? "—"}</td>
                      <td>{r.channel}</td><td>{r.recipient_masked ?? "—"}</td>
                      <td title={r.error_message ?? ""}>{r.status}</td>
                      <td>{r.click_count}</td><td>{r.response ?? "—"}</td>
                      <td>{r.sent_at ? new Date(r.sent_at).toLocaleString("fr-CA") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
