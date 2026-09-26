/**
 * UNPRO — Journal des communications contrôlées
 * Regroupe les envois courriel et SMS en quatre résultats lisibles :
 * envoyé / échoué / bloqué / non autorisé (+ en attente).
 * Lecture seule : ce panneau ne déclenche aucun envoi.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export type CommOutcome = "sent" | "failed" | "blocked" | "unauthorized" | "pending";

const OUTCOME_LABELS: Record<CommOutcome, string> = {
  sent: "Envoyé",
  failed: "Échoué",
  blocked: "Bloqué",
  unauthorized: "Non autorisé",
  pending: "En attente",
};

const OUTCOME_VARIANTS: Record<CommOutcome, "default" | "secondary" | "destructive" | "outline"> = {
  sent: "default",
  failed: "destructive",
  blocked: "outline",
  unauthorized: "destructive",
  pending: "secondary",
};

const UNAUTHORIZED_HINTS = ["unauthorized", "not authorized", "non autoris", "forbidden", "403", "401"];
const BLOCKED_HINTS = ["disabled", "suppress", "blocked", "bloqu", "opt_out", "unsubscrib", "consent"];

/** Classe un enregistrement d'envoi dans l'un des cinq résultats. */
export function classifyOutcome(status: string | null, errorMessage?: string | null): CommOutcome {
  const s = (status ?? "").toLowerCase();
  const e = (errorMessage ?? "").toLowerCase();

  if (UNAUTHORIZED_HINTS.some((h) => e.includes(h) || s.includes(h))) return "unauthorized";
  if (BLOCKED_HINTS.some((h) => e.includes(h) || s.includes(h))) return "blocked";
  if (["invalid_phone", "contact_required"].includes(s)) return "blocked";
  if (["sent", "delivered"].includes(s)) return "sent";
  if (["pending", "queued", "retry_scheduled"].includes(s)) return "pending";
  return "failed";
}

type Entry = {
  id: string;
  channel: "Courriel" | "SMS";
  recipient: string;
  status: string;
  error: string | null;
  outcome: CommOutcome;
  created_at: string;
};

const ORDER: CommOutcome[] = ["sent", "failed", "blocked", "unauthorized", "pending"];

export default function CommunicationsLogPanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-communications-log"],
    queryFn: async (): Promise<Entry[]> => {
      const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

      const [emails, sms] = await Promise.all([
        supabase
          .from("email_send_log")
          .select("id, recipient_email, status, error_message, created_at")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(300),
        supabase
          .from("sms_events_v2" as any)
          .select("id, status, created_at")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(300),
      ]);

      if (emails.error) throw emails.error;

      const rows: Entry[] = [];
      for (const r of (emails.data ?? []) as any[]) {
        rows.push({
          id: `email-${r.id}`,
          channel: "Courriel",
          recipient: r.recipient_email ?? "—",
          status: r.status,
          error: r.error_message ?? null,
          outcome: classifyOutcome(r.status, r.error_message),
          created_at: r.created_at,
        });
      }
      for (const r of ((sms.data ?? []) as any[])) {
        rows.push({
          id: `sms-${r.id}`,
          channel: "SMS",
          recipient: "—",
          status: r.status,
          error: null,
          outcome: classifyOutcome(r.status, null),
          created_at: r.created_at,
        });
      }

      return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
  });

  const counts = ORDER.map((o) => ({
    outcome: o,
    count: (data ?? []).filter((r) => r.outcome === o).length,
  }));

  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Journal des communications (30 jours)</h2>
        <span className="text-xs text-muted-foreground">Lecture seule — aucun envoi déclenché</span>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}

      {data && (
        <>
          <div className="flex flex-wrap gap-2">
            {counts.map(({ outcome, count }) => (
              <Badge key={outcome} variant={OUTCOME_VARIANTS[outcome]}>
                {OUTCOME_LABELS[outcome]} : {count}
              </Badge>
            ))}
          </div>

          <div className="max-h-80 overflow-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-2 font-medium">Canal</th>
                  <th className="p-2 font-medium">Destinataire</th>
                  <th className="p-2 font-medium">Résultat</th>
                  <th className="p-2 font-medium">Détail</th>
                  <th className="p-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 60).map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-2">{r.channel}</td>
                    <td className="p-2 text-muted-foreground">{r.recipient}</td>
                    <td className="p-2">
                      <Badge variant={OUTCOME_VARIANTS[r.outcome]}>{OUTCOME_LABELS[r.outcome]}</Badge>
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">{r.error ?? r.status}</td>
                    <td className="p-2 text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("fr-CA")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
