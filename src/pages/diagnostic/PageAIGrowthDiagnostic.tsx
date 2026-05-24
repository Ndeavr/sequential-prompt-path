import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { compute, fmtMoney, planPrice } from "@/features/growthDiagnostic/engine";
import { generateBubbles } from "@/features/growthDiagnostic/bubbles";
import {
  createOrUpdateDiagnostic,
  loadLocal,
  logEvent,
  saveLocal,
} from "@/features/growthDiagnostic/services";
import type {
  BusinessType,
  DiagnosticInputs,
  DiagnosticStep,
  SharedLeads,
} from "@/features/growthDiagnostic/types";
import "@/styles/diagnostic.css";

const TRADES: { id: BusinessType; label: string; emoji: string }[] = [
  { id: "roofing", label: "Toiture", emoji: "🏠" },
  { id: "insulation", label: "Isolation", emoji: "🧱" },
  { id: "hvac", label: "CVAC", emoji: "🌡️" },
  { id: "electrical", label: "Électricité", emoji: "⚡" },
  { id: "landscaping", label: "Paysagement", emoji: "🌿" },
  { id: "plumbing", label: "Plomberie", emoji: "🚰" },
  { id: "renovation", label: "Rénovation", emoji: "🔨" },
  { id: "painting", label: "Peinture", emoji: "🎨" },
  { id: "flooring", label: "Plancher", emoji: "🪵" },
  { id: "other", label: "Autre", emoji: "✨" },
];

const ORDER: DiagnosticStep[] = [
  "hero", "business_type", "location", "team", "revenue", "shared_leads", "diagnosis", "plan",
];

function useCountUp(target: number, duration = 900) {
  const [val, setVal] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    const start = prev.current;
    const delta = target - start;
    if (Math.abs(delta) < 1) { setVal(target); prev.current = target; return; }
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(start + delta * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else prev.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

function Orb({ label }: { label?: string }) {
  return (
    <div className="relative flex items-center justify-center">
      <div className="diag-orb w-28 h-28 sm:w-36 sm:h-36 rounded-full" style={{
        background: "radial-gradient(circle at 35% 30%, #7dd3fc, #38bdf8 35%, #2563eb 70%, #1e3a8a 100%)",
      }} />
      {label && (
        <div className="absolute -bottom-7 text-xs text-cyan-200/80 tracking-wider uppercase">{label}</div>
      )}
    </div>
  );
}

function Bubbles({ inputs }: { inputs: DiagnosticInputs }) {
  const bubbles = useMemo(() => generateBubbles(inputs), [inputs]);
  if (bubbles.length === 0) return null;
  const anims = ["diag-float-a", "diag-float-b", "diag-float-c"];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8">
      {bubbles.slice(0, 6).map((b, i) => (
        <div
          key={b.id}
          className={`diag-bubble diag-bubble--${b.category} p-4`}
          style={{ animation: `${anims[i % anims.length]} ${5 + (i % 3)}s cubic-bezier(.22,1,.36,1) infinite` }}
        >
          <div className="text-xs uppercase tracking-wider opacity-70 mb-1">
            {b.category === "loss" ? "Perte" : b.category === "opportunity" ? "Opportunité" : b.category === "insight" ? "Insight" : "Tendance"}
          </div>
          <div className="font-semibold text-base">{b.title}</div>
          <div className="text-sm opacity-80 mt-1">{b.detail}</div>
          {b.formatted_value && (
            <div className="mt-2 text-cyan-300 font-mono text-sm">{b.formatted_value}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function HUD({ inputs }: { inputs: DiagnosticInputs }) {
  const r = useMemo(() => compute(inputs), [inputs]);
  const loss = useCountUp(r.loss_monthly);
  const proj = useCountUp(r.projected_revenue);
  return (
    <div className="grid grid-cols-2 gap-3 mt-6">
      <div className="diag-bubble p-4">
        <div className="text-xs uppercase tracking-wider opacity-70">Perte mensuelle estimée</div>
        <div className="diag-counter text-2xl sm:text-3xl font-bold text-red-300 mt-1">{fmtMoney(loss)}</div>
      </div>
      <div className="diag-bubble p-4">
        <div className="text-xs uppercase tracking-wider opacity-70">Potentiel annuel</div>
        <div className="diag-counter text-2xl sm:text-3xl font-bold text-cyan-300 mt-1">{fmtMoney(proj)}</div>
      </div>
    </div>
  );
}

export default function PageAIGrowthDiagnostic() {
  const initial = loadLocal();
  const [id, setId] = useState<string | undefined>(initial.id);
  const [inputs, setInputs] = useState<DiagnosticInputs>(initial.inputs ?? {});
  const [step, setStep] = useState<DiagnosticStep>((initial.step as DiagnosticStep) ?? "hero");
  const [started, setStarted] = useState(step !== "hero");

  // Persist
  useEffect(() => {
    saveLocal({ id, inputs, step });
  }, [id, inputs, step]);

  const update = (patch: Partial<DiagnosticInputs>) => setInputs((p) => ({ ...p, ...patch }));

  const goNext = async () => {
    const i = ORDER.indexOf(step);
    const next = ORDER[Math.min(ORDER.length - 1, i + 1)];
    setStep(next);
    const r = compute(inputs);
    const newId = await createOrUpdateDiagnostic(id, inputs, next, {
      recommended_plan: r.recommended_plan,
      projected_revenue: r.projected_revenue,
      projected_loss_monthly: r.loss_monthly,
    });
    if (newId && newId !== id) setId(newId);
    logEvent(newId ?? id, "step_completed", { from: step, to: next });
    // Scroll to next section
    requestAnimationFrame(() => {
      document.getElementById(`section-${next}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const startFlow = async () => {
    setStarted(true);
    setStep("business_type");
    const newId = await createOrUpdateDiagnostic(undefined, inputs, "business_type");
    if (newId) setId(newId);
    logEvent(newId, "diagnostic_started");
    requestAnimationFrame(() => {
      document.getElementById("section-business_type")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const r = useMemo(() => compute(inputs), [inputs]);

  return (
    <div className="diag-bg min-h-screen">
      <Helmet>
        <title>Diagnostic IA de croissance pour entrepreneurs | UNPRO</title>
        <meta
          name="description"
          content="UNPRO analyse votre structure, votre conversion, votre visibilité et vos opportunités manquées en moins de 60 secondes. Découvrez votre potentiel réel."
        />
        <link rel="canonical" href="https://unpro.ca/diagnostic-ia" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: "Diagnostic IA de croissance UNPRO",
            provider: { "@type": "Organization", name: "UNPRO", url: "https://unpro.ca" },
            areaServed: "Québec",
            description:
              "Analyse IA personnalisée de votre entreprise de services résidentiels : pertes cachées, capacité, positionnement et plan recommandé.",
          })}
        </script>
      </Helmet>

      {/* HERO */}
      <section id="section-hero" className="diag-section">
        <div className="max-w-3xl mx-auto w-full text-center">
          <div className="flex justify-center mb-10"><Orb label="Alex · Analyste IA" /></div>
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight tracking-tight">
            Combien de revenus votre entreprise perd-elle chaque mois?
          </h1>
          <p className="mt-5 text-base sm:text-lg opacity-80 max-w-2xl mx-auto">
            UNPRO analyse votre structure, votre conversion, votre visibilité et vos opportunités manquées.
            Résultat personnalisé en moins de 60 secondes.
          </p>
          <button onClick={startFlow} className="diag-cta mt-10 inline-flex items-center gap-2">
            Démarrer l'analyse IA →
          </button>
          <div className="mt-6 text-xs opacity-60">Gratuit · Aucune carte requise · Confidentiel</div>
        </div>
      </section>

      {!started ? null : (
        <>
          {/* BUSINESS TYPE */}
          <section id="section-business_type" className="diag-section">
            <div className="max-w-3xl mx-auto w-full">
              <div className="text-sm uppercase tracking-wider opacity-60">Étape 1 / 5</div>
              <h2 className="text-2xl sm:text-3xl font-semibold mt-2">Quel est votre métier principal?</h2>
              <div className="flex flex-wrap gap-2 mt-6">
                {TRADES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => update({ business_type: t.id })}
                    className={`diag-chip ${inputs.business_type === t.id ? "diag-chip--active" : ""}`}
                  >
                    <span className="mr-2">{t.emoji}</span>{t.label}
                  </button>
                ))}
              </div>
              <div className="mt-8 flex justify-end">
                <button onClick={goNext} disabled={!inputs.business_type} className="diag-cta disabled:opacity-30">Continuer →</button>
              </div>
            </div>
          </section>

          {/* LOCATION */}
          <section id="section-location" className="diag-section">
            <div className="max-w-3xl mx-auto w-full">
              <div className="text-sm uppercase tracking-wider opacity-60">Étape 2 / 5</div>
              <h2 className="text-2xl sm:text-3xl font-semibold mt-2">Quelle ville desservez-vous principalement?</h2>
              <Input
                value={inputs.city ?? ""}
                onChange={(e) => update({ city: e.target.value })}
                placeholder="Ex. Montréal, Laval, Québec…"
                className="mt-6 bg-white/5 border-white/15 text-white placeholder:text-white/40 h-14 text-lg"
              />
              <Bubbles inputs={inputs} />
              <div className="mt-8 flex justify-end">
                <button onClick={goNext} disabled={!inputs.city} className="diag-cta disabled:opacity-30">Continuer →</button>
              </div>
            </div>
          </section>

          {/* TEAM */}
          <section id="section-team" className="diag-section">
            <div className="max-w-3xl mx-auto w-full">
              <div className="text-sm uppercase tracking-wider opacity-60">Étape 3 / 5</div>
              <h2 className="text-2xl sm:text-3xl font-semibold mt-2">Votre structure actuelle</h2>
              <div className="mt-8 space-y-8">
                <SliderRow label="Employés sur le terrain" value={inputs.team_size ?? 1} min={1} max={50} onChange={(v) => update({ team_size: v })} />
                <SliderRow label="Représentants des ventes" value={inputs.sales_reps ?? 0} min={0} max={20} onChange={(v) => update({ sales_reps: v })} />
                <SliderRow label="Camions / équipes mobiles" value={inputs.trucks ?? 1} min={0} max={30} onChange={(v) => update({ trucks: v })} />
                <SliderRow label="Projets par mois" value={inputs.monthly_projects ?? 0} min={0} max={200} onChange={(v) => update({ monthly_projects: v })} />
              </div>
              <Bubbles inputs={inputs} />
              <div className="mt-8 flex justify-end">
                <button onClick={goNext} className="diag-cta">Continuer →</button>
              </div>
            </div>
          </section>

          {/* REVENUE */}
          <section id="section-revenue" className="diag-section">
            <div className="max-w-3xl mx-auto w-full">
              <div className="text-sm uppercase tracking-wider opacity-60">Étape 4 / 5</div>
              <h2 className="text-2xl sm:text-3xl font-semibold mt-2">Vos chiffres clés</h2>
              <div className="mt-8 space-y-8">
                <SliderRow label="Chiffre d'affaires annuel" value={inputs.annual_revenue ?? 250000} min={50000} max={10_000_000} step={25000} onChange={(v) => update({ annual_revenue: v })} format={fmtMoney} />
                <SliderRow label="Valeur moyenne d'un contrat" value={inputs.avg_contract_value ?? 5000} min={500} max={150000} step={500} onChange={(v) => update({ avg_contract_value: v })} format={fmtMoney} />
                <SliderRow label="Rendez-vous par mois" value={inputs.monthly_appointments ?? 10} min={0} max={300} onChange={(v) => update({ monthly_appointments: v })} />
                <SliderRow label="Leads reçus par mois" value={inputs.monthly_leads ?? 20} min={0} max={500} onChange={(v) => update({ monthly_leads: v })} />
                <SliderRow label="Taux de fermeture (%)" value={inputs.closing_rate ?? 20} min={1} max={80} onChange={(v) => update({ closing_rate: v })} format={(v) => `${v} %`} />
              </div>
              <HUD inputs={inputs} />
              <Bubbles inputs={inputs} />
              <div className="mt-8 flex justify-end">
                <button onClick={goNext} className="diag-cta">Continuer →</button>
              </div>
            </div>
          </section>

          {/* SHARED LEADS */}
          <section id="section-shared_leads" className="diag-section">
            <div className="max-w-3xl mx-auto w-full">
              <div className="text-sm uppercase tracking-wider opacity-60">Étape 5 / 5</div>
              <h2 className="text-2xl sm:text-3xl font-semibold mt-2">Achetez-vous présentement des soumissions partagées?</h2>
              <p className="opacity-70 mt-2 text-sm">
                Plateformes type HomeStars, Réno-Assistance, Soumission Rénovation, etc.
              </p>
              <div className="flex flex-wrap gap-2 mt-6">
                {[
                  { id: "yes" as SharedLeads, label: "Oui, régulièrement" },
                  { id: "sometimes" as SharedLeads, label: "Parfois" },
                  { id: "no" as SharedLeads, label: "Non" },
                ].map((o) => (
                  <button
                    key={o.id}
                    onClick={() => update({ uses_shared_leads: o.id })}
                    className={`diag-chip ${inputs.uses_shared_leads === o.id ? "diag-chip--active" : ""}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              {inputs.uses_shared_leads === "yes" && (
                <div className="diag-bubble diag-bubble--loss mt-6 p-5">
                  <div className="text-cyan-200 font-semibold">Détection Alex</div>
                  <p className="mt-2 opacity-90 text-sm">
                    Chaque lead que vous achetez est partagé avec 4 à 5 concurrents. Votre marge se compresse même quand vous closez.
                    UNPRO opère sur un modèle de rendez-vous exclusifs — un seul entrepreneur par opportunité.
                  </p>
                </div>
              )}
              <div className="mt-8 flex justify-end">
                <button onClick={goNext} disabled={!inputs.uses_shared_leads} className="diag-cta disabled:opacity-30">Voir mon diagnostic →</button>
              </div>
            </div>
          </section>

          {/* DIAGNOSIS */}
          <section id="section-diagnosis" className="diag-section">
            <div className="max-w-4xl mx-auto w-full">
              <div className="text-sm uppercase tracking-wider opacity-60">Diagnostic IA</div>
              <h2 className="text-3xl sm:text-5xl font-bold mt-2 leading-tight tracking-tight">
                Votre entreprise laisse environ <span className="text-red-300">{fmtMoney(r.loss_monthly)}</span> sur la table chaque mois.
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8">
                <DiagCard label="Appels manqués" value={fmtMoney(r.loss_breakdown.missed_leads)} />
                <DiagCard label="Taxe leads partagés" value={fmtMoney(r.loss_breakdown.shared_leads_tax)} />
                <DiagCard label="Capacité sous-utilisée" value={fmtMoney(r.loss_breakdown.capacity_gap)} />
              </div>

              {/* Before / After */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10">
                <div className="diag-bubble p-6">
                  <div className="text-xs uppercase tracking-wider opacity-60">Aujourd'hui</div>
                  <div className="mt-2 text-2xl font-semibold text-red-200">{fmtMoney(r.current_revenue)}</div>
                  <ul className="mt-4 text-sm opacity-80 space-y-2">
                    <li>• Taux de fermeture : {inputs.closing_rate ?? 0} %</li>
                    <li>• Dépendance soumissions partagées : {inputs.uses_shared_leads === "yes" ? "élevée" : inputs.uses_shared_leads === "sometimes" ? "modérée" : "aucune"}</li>
                    <li>• Réponse aux appels : lente</li>
                  </ul>
                </div>
                <div className="diag-bubble diag-bubble--opportunity p-6">
                  <div className="text-xs uppercase tracking-wider opacity-60">Optimisé avec UNPRO</div>
                  <div className="mt-2 text-2xl font-semibold text-cyan-200">{fmtMoney(r.projected_revenue)}</div>
                  <ul className="mt-4 text-sm opacity-80 space-y-2">
                    <li>• Rendez-vous exclusifs (1 entrepreneur)</li>
                    <li>• Réponse automatisée &lt; 5 min</li>
                    <li>• Domination de territoire</li>
                  </ul>
                </div>
              </div>

              <div className="mt-10 text-center">
                <div className="text-xs uppercase tracking-wider opacity-60">Potentiel projeté · 12 mois</div>
                <div className="diag-counter text-5xl sm:text-7xl font-bold text-cyan-300 mt-2">
                  +{Math.round(r.uplift_pct * 100)} %
                </div>
              </div>

              <div className="mt-10 flex justify-center">
                <button onClick={goNext} className="diag-cta">Voir le plan recommandé →</button>
              </div>
            </div>
          </section>

          {/* PLAN */}
          <section id="section-plan" className="diag-section">
            <div className="max-w-3xl mx-auto w-full text-center">
              <div className="text-sm uppercase tracking-wider opacity-60">Plan recommandé par Alex</div>
              <h2 className="text-3xl sm:text-5xl font-bold mt-2 tracking-tight">
                {r.recommended_plan}
              </h2>
              <p className="opacity-80 mt-3 max-w-xl mx-auto">{r.plan_reason}</p>

              <div className="diag-bubble mt-8 p-8 text-left">
                <div className="flex items-baseline justify-between">
                  <div className="text-lg font-semibold">{r.recommended_plan}</div>
                  <div className="text-2xl font-bold text-cyan-300">
                    {fmtMoney(planPrice(r.recommended_plan))}<span className="text-sm opacity-60 font-normal"> / mois</span>
                  </div>
                </div>
                <ul className="mt-5 space-y-2 text-sm opacity-90">
                  <li>✓ Rendez-vous exclusifs dans votre territoire</li>
                  <li>✓ Réponse Alex IA en moins de 5 minutes</li>
                  <li>✓ Profil optimisé pour les moteurs de réponse IA</li>
                  <li>✓ Tableau de bord de croissance temps réel</li>
                </ul>
              </div>

              <div className="diag-bubble diag-bubble--opportunity mt-4 p-4 text-sm">
                <span className="opacity-80">⚜ Seulement </span>
                <strong className="text-cyan-200">3 places premium</strong>
                <span className="opacity-80"> restantes dans votre territoire.</span>
              </div>

              <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to={`/pro/checkout?plan=${encodeURIComponent(r.recommended_plan)}`}
                  className="diag-cta"
                  onClick={() => logEvent(id, "cta_clicked", { cta: "activate", plan: r.recommended_plan })}
                >
                  Activer mon profil →
                </Link>
                <Link
                  to="/pro/checkout?plan=Recrue&trial=1"
                  className="diag-bubble px-5 py-3 font-semibold"
                  onClick={() => logEvent(id, "cta_clicked", { cta: "trial" })}
                >
                  Démarrer pour 1 $
                </Link>
              </div>
              <div className="mt-6 text-xs opacity-50">Sans engagement · Annulable en tout temps</div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function SliderRow({
  label, value, min, max, step = 1, onChange, format,
}: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; format?: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex justify-between items-baseline">
        <label className="text-sm opacity-80">{label}</label>
        <div className="diag-counter text-cyan-300 font-semibold">{format ? format(value) : value}</div>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} className="mt-3" />
    </div>
  );
}

function DiagCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="diag-bubble p-4">
      <div className="text-xs uppercase tracking-wider opacity-60">{label}</div>
      <div className="diag-counter mt-2 text-xl font-bold text-red-200">{value}</div>
    </div>
  );
}
