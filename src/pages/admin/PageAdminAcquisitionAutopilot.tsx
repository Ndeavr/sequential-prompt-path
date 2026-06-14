import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Counts = {
  discovered: number;
  sms_today: number;
  email_today: number;
  onboarding_started: number;
  payment_started: number;
  paid: number;
  profile_active: number;
  failed: number;
};

export default function PageAdminAcquisitionAutopilot() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0);
        const iso = startOfDay.toISOString();

        const statuses: Array<keyof Counts> = [
          "discovered",
          "onboarding_started",
          "payment_started",
          "paid",
          "profile_active",
          "failed",
        ];

        const result: Counts = {
          discovered: 0,
          sms_today: 0,
          email_today: 0,
          onboarding_started: 0,
          payment_started: 0,
          paid: 0,
          profile_active: 0,
          failed: 0,
        };

        await Promise.all(
          statuses.map(async (s) => {
            const { count } = await (supabase as any)
              .from("contractor_leads")
              .select("id", { count: "exact", head: true })
              .eq("pipeline_status", s);
            result[s] = count ?? 0;
          })
        );

        const { count: smsCount } = await (supabase as any)
          .from("contractor_outreach_logs")
          .select("id", { count: "exact", head: true })
          .eq("channel", "sms")
          .gte("sent_at", iso);
        result.sms_today = smsCount ?? 0;

        const { count: emailCount } = await (supabase as any)
          .from("contractor_outreach_logs")
          .select("id", { count: "exact", head: true })
          .eq("channel", "email")
          .gte("sent_at", iso);
        result.email_today = emailCount ?? 0;

        if (!cancelled) setCounts(result);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Erreur de chargement");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="admin-theme min-h-screen bg-background text-foreground p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Acquisition Autopilot</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pipeline autonome — aucune action manuelle requise. Le cron tourne toutes les 15 minutes.
          </p>
        </header>

        {loading && <div className="text-muted-foreground">Chargement…</div>}
        {error && <div className="text-destructive">Erreur: {error}</div>}

        {counts && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {([
              ["Découverts", counts.discovered],
              ["SMS envoyés (auj.)", counts.sms_today],
              ["Emails envoyés (auj.)", counts.email_today],
              ["Onboarding démarré", counts.onboarding_started],
              ["Paiement démarré", counts.payment_started],
              ["Payés", counts.paid],
              ["Profils actifs", counts.profile_active],
              ["Échecs", counts.failed],
            ] as Array<[string, number]>).map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {label}
                </div>
                <div className="mt-2 text-3xl font-semibold">{value}</div>
                {value === 0 && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Aucun événement aujourd'hui
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
