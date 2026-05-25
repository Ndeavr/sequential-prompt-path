/**
 * /pro/diagnostic/:slug — Public landing for outbound prospects.
 * Cinematic dark theme. AIPP score reveal, weaknesses, plan recommendation, Stripe checkout.
 * Token comes from ?t=... query param.
 */
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldCheck, AlertTriangle, TrendingUp, Sparkles, CheckCircle2 } from "lucide-react";

interface LandingPayload {
  landing: any;
  company: any;
  lead: any;
  score: any;
  personalization: any;
}

const PLANS = [
  { code: "pro", name: "Pro", price: 349, tagline: "Démarrage rapide", features: ["Visibilité IA de base", "Profil vérifié", "10 RDV/mois"] },
  { code: "premium", name: "Premium", price: 599, tagline: "Recommandé", featured: true, features: ["Visibilité IA prioritaire", "Boost SEO local", "25 RDV/mois", "Alex matching IA"] },
  { code: "elite", name: "Élite", price: 999, tagline: "Domination locale", features: ["Visibilité maximale", "Citations LLM (ChatGPT, Gemini)", "Volume illimité", "Concierge dédié"] },
];

function recommendPlan(score: number): string {
  if (score < 40) return "pro";
  if (score < 65) return "premium";
  return "elite";
}

export default function PageOutboundLanding() {
  const { slug } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  const token = params.get("t");
  const [data, setData] = useState<LandingPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [revealedScore, setRevealedScore] = useState(0);

  useEffect(() => {
    if (!slug || !token) { setErr("Lien invalide"); setLoading(false); return; }
    (async () => {
      try {
        const { data: res, error } = await supabase.functions.invoke("outbound-landing-resolve", {
          method: "GET" as any,
        });
        // GET with query — use fetch directly for query params
        const url = `${(supabase as any).functionsUrl || `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1`}/outbound-landing-resolve?slug=${encodeURIComponent(slug)}&t=${encodeURIComponent(token)}`;
        const r = await fetch(url, { headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` } });
        const j = await r.json();
        if (!r.ok || j.error) throw new Error(j.error || "Page introuvable");
        setData(j);
      } catch (e: any) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, token]);

  const score = useMemo(() => (data?.score?.score_json?.total ?? 0) as number, [data]);
  const weaknesses = useMemo(() => (data?.score?.score_json?.weaknesses ?? []) as string[], [data]);
  const components = useMemo(() => (data?.score?.score_json?.components ?? {}) as Record<string, number>, [data]);
  const recommended = useMemo(() => recommendPlan(score), [score]);

  // Animate score reveal
  useEffect(() => {
    if (!score) return;
    let cur = 0;
    const step = Math.max(1, Math.round(score / 40));
    const id = setInterval(() => {
      cur = Math.min(score, cur + step);
      setRevealedScore(cur);
      if (cur >= score) clearInterval(id);
    }, 25);
    return () => clearInterval(id);
  }, [score]);

  async function startCheckout(planCode: string) {
    if (!slug || !token) return;
    setCheckingOut(planCode);
    try {
      const { data: res, error } = await supabase.functions.invoke("outbound-checkout-start", {
        body: { slug, token, plan_code: planCode },
      });
      if (error) throw error;
      if (res?.url) window.location.href = res.url;
    } catch (e: any) {
      alert(e.message);
    } finally {
      setCheckingOut(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050816] flex items-center justify-center text-white/70">
        <Loader2 className="w-6 h-6 animate-spin mr-3" /> Analyse en cours…
      </div>
    );
  }
  if (err || !data) {
    return (
      <div className="min-h-screen bg-[#050816] flex items-center justify-center text-white/80 px-6 text-center">
        <div>
          <AlertTriangle className="w-10 h-10 mx-auto mb-4 text-amber-400" />
          <p className="text-lg">Cette page n'est plus disponible ou le lien a expiré.</p>
        </div>
      </div>
    );
  }

  const company = data.company || {};
  const companyName = company.company_name || "Votre entreprise";
  const verdict = score >= 75 ? "Excellent point de départ."
    : score >= 55 ? "Marge claire d'amélioration."
    : score >= 35 ? "Visibilité IA limitée — opportunités majeures."
    : "Profil IA critique — vous êtes invisible pour ChatGPT et Gemini.";

  return (
    <div className="min-h-screen bg-[#050816] text-white relative overflow-x-hidden">
      {/* Background layers */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[60vw] h-[60vw] rounded-full opacity-30 blur-[120px]"
          style={{ background: "radial-gradient(circle, rgba(59,130,246,0.4), transparent 70%)" }} />
        <div className="absolute bottom-0 right-0 w-[50vw] h-[50vw] rounded-full opacity-25 blur-[120px]"
          style={{ background: "radial-gradient(circle, rgba(34,211,238,0.35), transparent 70%)" }} />
      </div>

      <div className="relative max-w-3xl mx-auto px-5 py-12 md:py-20 space-y-12">

        {/* Hero */}
        <header className="text-center space-y-4">
          <p className="uppercase tracking-[0.3em] text-xs text-cyan-300/70">Analyse IA UNPRO</p>
          <h1 className="text-3xl md:text-5xl font-semibold tracking-[-0.04em] leading-[1.05]">
            {companyName}
          </h1>
          <p className="text-white/60 text-sm md:text-base">
            {company.city ? `${company.specialty || company.trade || "Entrepreneur"} · ${company.city}` : "Analyse complète"}
          </p>
        </header>

        {/* Score reveal */}
        <section className="rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-8 md:p-12 text-center">
          <p className="text-xs uppercase tracking-widest text-white/50 mb-4">Score AIPP</p>
          <div className="text-7xl md:text-8xl font-bold tracking-tighter tabular-nums" style={{
            background: score >= 65 ? "linear-gradient(135deg, #22d3ee, #3b82f6)" : score >= 40 ? "linear-gradient(135deg, #fbbf24, #f97316)" : "linear-gradient(135deg, #f87171, #ec4899)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            {revealedScore}<span className="text-3xl text-white/30">/100</span>
          </div>
          <p className="mt-6 text-lg md:text-xl text-white/80 max-w-md mx-auto">{verdict}</p>
        </section>

        {/* Breakdown */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight px-1">Détail par dimension</h2>
          {[
            { key: "website", label: "Site web", max: 20 },
            { key: "google", label: "Google Business", max: 20 },
            { key: "reviews", label: "Avis clients", max: 15 },
            { key: "trust", label: "Confiance (RBQ, NEQ)", max: 15 },
            { key: "aeo", label: "Visibilité IA (LLM)", max: 20 },
            { key: "conversion", label: "Conversion", max: 10 },
          ].map(({ key, label, max }) => {
            const val = components[key] ?? 0;
            const pct = (val / max) * 100;
            return (
              <div key={key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-white/80">{label}</span>
                  <span className="tabular-nums text-white/60">{val}/{max}</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: pct >= 65 ? "#22d3ee" : pct >= 40 ? "#fbbf24" : "#f87171" }} />
                </div>
              </div>
            );
          })}
        </section>

        {/* Weaknesses */}
        {weaknesses.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight px-1 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" /> Faiblesses critiques détectées
            </h2>
            {weaknesses.slice(0, 4).map((w, i) => (
              <div key={i} className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-4 flex gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 text-xs flex items-center justify-center font-semibold flex-shrink-0">{i + 1}</span>
                <p className="text-white/85 text-sm leading-relaxed">{w}</p>
              </div>
            ))}
          </section>
        )}

        {/* Revenue projection */}
        <section className="rounded-[28px] border border-cyan-400/20 bg-gradient-to-br from-cyan-500/[0.08] to-blue-500/[0.05] p-6 md:p-8">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-6 h-6 text-cyan-300 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-white">Projection avec UNPRO</h3>
              <p className="text-white/70 text-sm mt-2">
                En corrigeant ces faiblesses et en activant la visibilité IA UNPRO, des entrepreneurs comparables génèrent
                <strong className="text-cyan-200"> +15 à +30 rendez-vous qualifiés par mois</strong> dans les 90 premiers jours.
              </p>
            </div>
          </div>
        </section>

        {/* Plans */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight text-center">Activer votre profil UNPRO</h2>
          <p className="text-center text-white/60 text-sm">Plan recommandé selon votre profil : <strong className="text-cyan-200">{PLANS.find(p => p.code === recommended)?.name}</strong></p>
          <div className="grid gap-4 md:grid-cols-3 mt-6">
            {PLANS.map(p => {
              const isRec = p.code === recommended;
              return (
                <div key={p.code} className={`rounded-[28px] border p-6 flex flex-col transition-all ${
                  isRec ? "border-cyan-400/40 bg-cyan-500/[0.06] shadow-[0_0_60px_-15px_rgba(34,211,238,0.4)]" : "border-white/10 bg-white/[0.03]"
                }`}>
                  {isRec && <span className="self-start mb-3 text-[10px] uppercase tracking-widest bg-cyan-400 text-[#050816] px-2 py-0.5 rounded-full font-bold">Recommandé</span>}
                  <h3 className="text-xl font-semibold">{p.name}</h3>
                  <p className="text-xs text-white/50 mt-1">{p.tagline}</p>
                  <div className="mt-4 mb-5">
                    <span className="text-3xl font-bold">{p.price}$</span>
                    <span className="text-sm text-white/50">/mois</span>
                  </div>
                  <ul className="space-y-2 text-sm text-white/75 mb-6 flex-1">
                    {p.features.map(f => (
                      <li key={f} className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-300 flex-shrink-0 mt-0.5" />{f}</li>
                    ))}
                  </ul>
                  <button
                    onClick={() => startCheckout(p.code)}
                    disabled={checkingOut !== null}
                    className={`w-full rounded-[18px] py-3 font-medium transition-all hover:-translate-y-0.5 disabled:opacity-50 ${
                      isRec ? "bg-cyan-400 text-[#050816] hover:bg-cyan-300" : "bg-white/10 text-white hover:bg-white/15 border border-white/10"
                    }`}
                  >
                    {checkingOut === p.code ? <Loader2 className="w-4 h-4 animate-spin inline" /> : "Activer mon profil"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Trust strip */}
        <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 grid grid-cols-3 gap-4 text-center text-xs text-white/60">
          <div><ShieldCheck className="w-5 h-5 mx-auto mb-2 text-cyan-300" />RBQ vérifié</div>
          <div><Sparkles className="w-5 h-5 mx-auto mb-2 text-cyan-300" />IA propriétaire</div>
          <div><CheckCircle2 className="w-5 h-5 mx-auto mb-2 text-cyan-300" />Garantie 30 jours</div>
        </section>

        <footer className="text-center text-xs text-white/40 pt-6 pb-2">
          UNPRO · Made in Québec ⚜️
        </footer>
      </div>
    </div>
  );
}
