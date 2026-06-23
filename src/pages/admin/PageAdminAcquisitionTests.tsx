import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type TestResult = { ok: boolean; data?: any; error?: string; timestamp: string };

function ResultBlock({ result }: { result: TestResult | null }) {
  if (!result) return null;
  return (
    <pre className={`mt-2 max-h-64 overflow-auto rounded-md border p-3 text-[11px] ${result.ok ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-100" : "border-red-500/30 bg-red-500/10 text-red-100"}`}>
{JSON.stringify(result, null, 2)}
    </pre>
  );
}

function TestCard({
  title, description, run,
}: { title: string; description: string; run: () => Promise<TestResult> }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="text-sm font-medium text-white/90">{title}</div>
      <p className="mt-1 text-xs text-white/60">{description}</p>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try { setResult(await run()); }
          finally { setBusy(false); }
        }}
        className="mt-3 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white/90 hover:bg-white/15 disabled:opacity-50"
      >
        {busy ? "Exécution…" : "Lancer le test"}
      </button>
      <ResultBlock result={result} />
    </div>
  );
}

async function invoke(name: string, body: Record<string, unknown> = {}): Promise<TestResult> {
  try {
    const { data, error } = await supabase.functions.invoke(name, { body });
    if (error) return { ok: false, error: error.message, data, timestamp: new Date().toISOString() };
    const ok = (data as any)?.ok !== false;
    return { ok, data, timestamp: new Date().toISOString() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e), timestamp: new Date().toISOString() };
  }
}

export default function PageAdminAcquisitionTests() {
  const [adminPhone, setAdminPhone] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [trackingId, setTrackingId] = useState("");

  return (
    <div className="alex-immersive min-h-screen bg-[#050816] p-6 text-white">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Tests acquisition pipeline</h1>
        <p className="mt-1 text-sm text-white/60">
          Chaque test génère un événement dans <code>acquisition_events</code>. Vérifier ensuite le dashboard funnel pour confirmer la propagation.
        </p>
      </header>

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="block">
          <span className="text-xs text-white/50">Téléphone admin (E.164)</span>
          <input value={adminPhone} onChange={(e) => setAdminPhone(e.target.value)} placeholder="+15145551234"
            className="mt-1 w-full rounded-md border border-white/15 bg-white/[0.04] px-3 py-1.5 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs text-white/50">Email admin</span>
          <input value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@unpro.ca"
            className="mt-1 w-full rounded-md border border-white/15 bg-white/[0.04] px-3 py-1.5 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs text-white/50">Tracking ID (pour simulation clic)</span>
          <input value={trackingId} onChange={(e) => setTrackingId(e.target.value)} placeholder="généré ci-dessous"
            className="mt-1 w-full rounded-md border border-white/15 bg-white/[0.04] px-3 py-1.5 text-sm" />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TestCard
          title="1. Générer un lien de tracking"
          description="Crée une entrée acquisition_tracking_links et retourne l'URL /r/{id}."
          run={() => invoke("acq-test-tracking-link", { destination_url: "https://unpro.ca/entrepreneur" }).then(r => {
            const id = r.data?.id;
            if (id) setTrackingId(id);
            return r;
          })}
        />
        <TestCard
          title="2. Simuler un clic"
          description="Appelle l'edge function de redirection côté serveur. Log un événement clicked."
          run={() => invoke("acq-test-simulate-click", { tracking_id: trackingId })}
        />
        <TestCard
          title="3. Envoyer un SMS de test (Twilio)"
          description="Envoie via Twilio avec StatusCallback configuré. Loggue 'sent', attend 'delivered' via webhook."
          run={() => invoke("acq-test-send-sms", { to: adminPhone })}
        />
        <TestCard
          title="4. Envoyer un email de test (Resend)"
          description="Envoie via Resend avec tags tracking_id. Loggue 'sent', webhook Resend logguera 'delivered'/'opened'."
          run={() => invoke("acq-test-send-email", { to: adminEmail })}
        />
        <TestCard
          title="5. Vérifier la santé du pipeline"
          description="Statut credentials + webhooks pour Twilio, Resend, Stripe, Redirect Tracker."
          run={() => invoke("acquisition-health-check")}
        />
        <TestCard
          title="6. Recalculer le funnel"
          description="Force la recompilation des compteurs à partir de acquisition_events."
          run={() => invoke("acquisition-funnel-live")}
        />
      </div>
    </div>
  );
}
