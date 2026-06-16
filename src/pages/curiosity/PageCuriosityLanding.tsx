// UNPRO — Curiosity funnel landing page (/ia/:slug)
// Hero + 4 sections + inline reveal orchestrator (live analysis → score → activation CTA).
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Lead = { lead_id: string; business_name?: string; first_name?: string; city?: string; service?: string };
type Analysis = {
  ok: boolean; score: number; gaps: { key: string; label: string; points: number }[];
  opportunities: { conversations: number; quotes: number; bookings_min: number; bookings_max: number };
  business_name?: string; city?: string; service?: string;
};

const MILESTONES = [
  "Avis clients analysés",
  "Site web analysé",
  "Présence locale analysée",
  "Signaux de confiance analysés",
  "Comparaison concurrentielle analysée",
  "Probabilité de recommandation calculée",
];

export default function PageCuriosityLanding() {
  const { slug = "" } = useParams();
  const [params] = useSearchParams();
  const token = params.get("t") ?? "";
  const [lead, setLead] = useState<Lead | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [phase, setPhase] = useState<"landing" | "analyzing" | "revealed">("landing");
  const [tick, setTick] = useState(0);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    if (!slug || !token) { setNotFound(true); return; }
    (async () => {
      const { data, error } = await supabase.functions.invoke("curiosity-page-resolve", { body: { slug, token } });
      if (error || !data?.ok) { setNotFound(true); return; }
      setLead(data.lead);
    })();
  }, [slug, token]);

  async function startReveal() {
    setPhase("analyzing");
    setTick(0);
    const analyzePromise = supabase.functions.invoke("curiosity-analyze", { body: { slug, token } });
    // Animate ticks over ~7s
    for (let i = 0; i < MILESTONES.length; i++) {
      await new Promise((r) => setTimeout(r, 1100 + Math.random() * 200));
      setTick(i + 1);
    }
    const { data } = await analyzePromise;
    if (data?.ok) { setAnalysis(data as Analysis); setPhase("revealed"); }
    else { setPhase("landing"); }
  }

  async function activate() {
    if (activating) return;
    setActivating(true);
    const { data } = await supabase.functions.invoke("curiosity-checkout-start", { body: { slug, token } });
    if (data?.ok && data.activation_url) window.location.href = data.activation_url;
    else setActivating(false);
  }

  if (notFound) {
    return (
      <div className="alex-immersive min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold">Ce lien n'est plus actif</h1>
          <p className="text-readable-secondary mt-2">Contactez UNPRO pour obtenir une nouvelle analyse.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="alex-immersive min-h-screen text-foreground">
      <main className="max-w-3xl mx-auto px-5 pt-12 pb-32 space-y-16">
        {/* Hero */}
        <section className="space-y-6">
          <p className="text-xs uppercase tracking-[0.2em] text-readable-secondary">UNPRO · Analyse IA</p>
          <h1 className="text-3xl sm:text-5xl font-semibold leading-[1.05] tracking-[-0.04em]">
            {lead?.business_name ? `${lead.business_name}, ` : ""}votre entreprise serait-elle recommandée par l'IA aujourd'hui?
          </h1>
          <p className="text-readable-body text-base sm:text-lg">
            Découvrez gratuitement comment ChatGPT, Gemini et les moteurs IA perçoivent votre entreprise.
          </p>
          {phase === "landing" && (
            <Button size="lg" onClick={startReveal} className="text-base px-6 py-6">
              Voir mon analyse IA gratuite
            </Button>
          )}
        </section>

        {/* Reveal */}
        {phase === "analyzing" && (
          <Card className="glass-strong p-6 space-y-3">
            <p className="text-sm text-readable-secondary">Analyse en cours…</p>
            <ul className="space-y-2 text-sm">
              {MILESTONES.map((m, i) => (
                <li key={m} className={`flex items-center gap-2 transition-opacity ${i < tick ? "opacity-100" : "opacity-30"}`}>
                  <span className={i < tick ? "text-emerald-400" : "text-readable-muted"}>{i < tick ? "✓" : "◦"}</span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {phase === "revealed" && analysis && (
          <section className="space-y-6">
            <Card className="glass-strong p-6 text-center space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-readable-secondary">Votre Score de Recommandation IA</p>
              <div className="text-6xl font-semibold tabular-nums">{analysis.score}<span className="text-2xl text-readable-muted"> / 100</span></div>
            </Card>

            <Card className="glass-strong p-6 space-y-3">
              <h2 className="text-lg font-semibold">Ce que ça veut dire</h2>
              <p className="text-readable-body text-sm">
                Si un propriétaire demandait : « Qui choisir pour {analysis.service || "ce service"}{analysis.city ? ` à ${analysis.city}` : ""}? »,
                votre entreprise pourrait ne pas figurer parmi les recommandations les plus fortes aujourd'hui.
              </p>
              <div className="pt-2">
                <p className="text-xs uppercase tracking-wide text-readable-secondary mb-2">Plus grandes opportunités</p>
                <ul className="space-y-1.5 text-sm">
                  {analysis.gaps.map((g) => (
                    <li key={g.key} className="flex items-center justify-between">
                      <span>{g.label}</span>
                      <span className="text-emerald-400 font-semibold tabular-nums">+{g.points} pts</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            <Card className="glass-strong p-6 space-y-3">
              <h2 className="text-lg font-semibold">Opportunités mensuelles actuellement manquées</h2>
              <ul className="space-y-1.5 text-sm">
                <li>≈ <b>{analysis.opportunities.conversations}</b> conversations avec propriétaires</li>
                <li>≈ <b>{analysis.opportunities.quotes}</b> demandes de soumissions</li>
                <li>≈ <b>{analysis.opportunities.bookings_min}–{analysis.opportunities.bookings_max}</b> rendez-vous réservés</li>
              </ul>
            </Card>

            <Button size="lg" onClick={activate} disabled={activating} className="w-full text-base py-6">
              {activating ? "Préparation…" : "Activer mon profil et améliorer mon score"}
            </Button>
          </section>
        )}

        {/* Static sections — visible always; hidden after reveal to reduce noise */}
        {phase !== "revealed" && (
          <>
            <Section title="Le plus grand changement depuis Google">
              <p>Pendant 20 ans, Google répondait aux recherches. Aujourd'hui, les propriétaires demandent directement à l'IA :</p>
              <ul className="list-disc pl-5 space-y-1 mt-3">
                <li>Quel entrepreneur choisir?</li>
                <li>Qui est le plus fiable?</li>
                <li>Qui offre le meilleur rapport qualité-prix?</li>
                <li>Qui recommanderiez-vous?</li>
              </ul>
              <p className="mt-3">L'IA commence à répondre à leur place.</p>
            </Section>

            <Section title="Les règles changent">
              <p><b>Avant :</b> plus de budget = plus de visibilité.</p>
              <p className="mt-2"><b>Maintenant :</b> l'IA observe les avis, l'expertise démontrée, la cohérence des informations, la présence locale, l'historique numérique et la réputation.</p>
              <p className="mt-3">Une entreprise de 3 employés peut désormais rivaliser avec une entreprise de 100.</p>
            </Section>

            <Section title="Votre Score de Recommandation IA">
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-6">
                {["Présence web","Réputation","Signaux de confiance","Autorité locale","Complétude du profil","Probabilité de recommandation","Opportunités d'amélioration"].map((s) => (
                  <li key={s} className="flex items-center gap-2"><span className="text-emerald-400">✓</span>{s}</li>
                ))}
              </ul>
            </Section>

            <Section title="Pourquoi agir maintenant?">
              <p>Les entreprises qui construisent leur présence IA aujourd'hui prennent une avance difficile à rattraper. Chaque avis, projet documenté, page informative et interaction client devient un signal que l'IA apprend à reconnaître.</p>
            </Section>

            <div className="text-center space-y-3 pt-6">
              <h2 className="text-2xl font-semibold tracking-[-0.03em]">Découvrez comment l'IA voit votre entreprise</h2>
              <p className="text-readable-secondary text-sm">Analyse gratuite · Aucun engagement · Résultats en quelques secondes</p>
              {phase === "landing" && (
                <Button size="lg" onClick={startReveal} className="text-base px-6 py-6">Voir mon score IA</Button>
              )}
            </div>
          </>
        )}
      </main>

      {/* Sticky mobile CTA */}
      {phase === "landing" && (
        <div className="fixed bottom-0 inset-x-0 p-4 backdrop-blur-md bg-background/80 border-t border-white/5 sm:hidden">
          <Button onClick={startReveal} className="w-full py-5">Voir mon analyse IA gratuite</Button>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl sm:text-2xl font-semibold tracking-[-0.03em]">{title}</h2>
      <div className="text-readable-body text-sm sm:text-base leading-relaxed">{children}</div>
    </section>
  );
}
