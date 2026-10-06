/**
 * UNPRO — Tableau unique d'acquisition entrepreneurs.
 * KPI principal : activations par jour. Chiffres réels (RPC admin), aucun estimé.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Funnel = Record<string, number | boolean | string | null>;

const STEPS: [string, string][] = [
  ["found", "Trouvés"],
  ["eligible", "Admissibles (mobile + base légale)"],
  ["sent", "SMS acceptés par Twilio"],
  ["delivered", "Livrés"],
  ["clicked", "Cliqués"],
  ["onboarding_started", "Parcours commencé"],
  ["completed", "Parcours complété"],
  ["payment_started", "Paiement commencé"],
  ["activated", "Activés"],
];

function startOfTorontoDay(daysAgo = 0) {
  const now = new Date();
  const tz = new Date(now.toLocaleString("en-US", { timeZone: "America/Toronto" }));
  const offset = now.getTime() - tz.getTime();
  tz.setHours(0, 0, 0, 0);
  tz.setDate(tz.getDate() - daysAgo);
  return new Date(tz.getTime() + offset).toISOString();
}

function useFunnel(since: string) {
  return useQuery({
    queryKey: ["admin-acq-funnel", since],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("admin_acquisition_funnel", { p_since: since });
      if (error) throw error;
      return data as Funnel;
    },
    refetchInterval: 60_000,
  });
}

const pct = (a: unknown, b: unknown) =>
  typeof a === "number" && typeof b === "number" && b > 0 ? `${Math.round((a / b) * 100)} %` : "—";

function FunnelBlock({ title, since }: { title: string; since: string }) {
  const { data, isLoading, error } = useFunnel(since);
  if (isLoading) return <p className="text-muted-foreground">Chargement…</p>;
  if (error) return <p className="text-destructive">Données indisponibles : {(error as Error).message}</p>;
  const d = data ?? {};
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="grid gap-2 sm:grid-cols-3">
        {STEPS.map(([k, label], i) => (
          <div key={k} className="rounded-xl border border-border bg-card p-3">
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="text-2xl font-bold text-foreground">{String(d[k] ?? 0)}</div>
            {i > 0 && <div className="text-xs text-muted-foreground">Conversion : {pct(d[k], d[STEPS[i - 1][0]])}</div>}
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Échecs de livraison : {String(d.failed ?? 0)} · Livraison {pct(d.delivered, d.sent)} · Clic {pct(d.clicked, d.delivered)}
      </p>
    </section>
  );
}

export default function PageAdminAcquisitionFunnel() {
  const today = startOfTorontoDay(0);
  const { data } = useFunnel(today);
  const on = data?.outreach_enabled === true || data?.outreach_enabled === "true";
  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Acquisition entrepreneurs</h1>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-sm text-muted-foreground">Activations aujourd'hui</div>
          <div className="text-5xl font-bold text-foreground">{String(data?.activated ?? 0)}</div>
        </div>
        <p className={on ? "text-primary" : "text-destructive"}>
          Prospection SMS : {on ? "ACTIVÉE" : "DÉSACTIVÉE — aucun SMS de prospection ne part"}
        </p>
      </header>
      <FunnelBlock title="Aujourd'hui" since={today} />
      <FunnelBlock title="7 derniers jours" since={startOfTorontoDay(7)} />
    </div>
  );
}
