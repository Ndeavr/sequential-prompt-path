/**
 * PageContractorAIScoreLanding — /contractor/ai-score/:prospectId
 *
 * Landing publique (sans auth) pour un entrepreneur prospect.
 * Affiche AIPP score réel, objectif, capacité, plan recommandé via
 * compute-pricing-quote, puis checkout Stripe via create-contractor-checkout.
 *
 * Copy guardrails: jamais "leads", toujours "rendez-vous exclusifs".
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Loader2, Sparkles, TrendingUp, Shield, Target } from "lucide-react";
import { toast } from "sonner";

type Prospect = {
  id: string;
  business_name: string;
  trade: string | null;
  city: string | null;
  aipp_score: number | null;
  review_count: number | null;
  review_rating: number | null;
  rbq: string | null;
  website_url: string | null;
};

type AIPPSnapshot = {
  strengths?: string[];
  weaknesses?: string[];
};

const OBJECTIVES = [
  { key: "more_appts",     label: "Plus de rendez-vous",          minPlan: "pro"     },
  { key: "better_terr",    label: "Meilleur territoire",          minPlan: "premium" },
  { key: "fill_agenda",    label: "Remplir mon agenda",           minPlan: "premium" },
  { key: "ai_recommended", label: "Être recommandé par l'IA",     minPlan: "elite"   },
];

const PLAN_NAMES: Record<string, { name: string; price: number; appts: number }> = {
  recrue:    { name: "Recrue",    price: 149,  appts: 0  },
  pro:       { name: "Pro",       price: 349,  appts: 5  },
  premium:   { name: "Premium",   price: 599,  appts: 10 },
  elite:     { name: "Élite",     price: 999,  appts: 25 },
  signature: { name: "Signature", price: 1799, appts: 50 },
};

const PLAN_ORDER = ["recrue", "pro", "premium", "elite", "signature"];

function pickPlan(objective: string, capacity: number, currentReco?: string | null): string {
  const objMin = OBJECTIVES.find((o) => o.key === objective)?.minPlan ?? "pro";
  const capPlan =
    capacity >= 40 ? "signature" :
    capacity >= 20 ? "elite" :
    capacity >= 10 ? "premium" :
    capacity >= 5  ? "pro" : "pro";
  // Never downsell — pick max of all signals
  const candidates = [objMin, capPlan, currentReco ?? "pro"].filter(Boolean) as string[];
  return candidates.reduce((max, c) =>
    PLAN_ORDER.indexOf(c) > PLAN_ORDER.indexOf(max) ? c : max,
  "pro");
}

export default function PageContractorAIScoreLanding() {
  const { prospectId } = useParams<{ prospectId: string }>();
  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [snapshot, setSnapshot] = useState<AIPPSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [objective, setObjective] = useState<string>("more_appts");
  const [capacity, setCapacity] = useState<number>(10);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    if (!prospectId) return;
    (async () => {
      const { data, error } = await supabase
        .from("contractor_prospects")
        .select(
          "id,business_name,trade,city,aipp_score,review_count,review_rating,rbq,website_url,recommended_plan,estimated_capacity",
        )
        .eq("id", prospectId)
        .maybeSingle();
      if (error || !data) {
        toast.error("Profil introuvable");
        setLoading(false);
        return;
      }
      setProspect(data as Prospect);
      if ((data as any).estimated_capacity) setCapacity((data as any).estimated_capacity);

      // Fetch AIPP snapshot for strengths/weaknesses (best-effort)
      const { data: snap } = await supabase
        .from("prospect_aipp_snapshots" as any)
        .select("strengths,weaknesses")
        .eq("prospect_id", prospectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (snap) setSnapshot(snap as AIPPSnapshot);

      setLoading(false);
    })();
  }, [prospectId]);

  const planCode = prospect ? pickPlan(objective, capacity, (prospect as any).recommended_plan) : "pro";
  const planDef = PLAN_NAMES[planCode];

  const startCheckout = async () => {
    if (!prospect) return;
    setCheckingOut(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-contractor-checkout", {
        body: { plan_code: planCode, prospect_id: prospect.id, objective, monthly_capacity: capacity },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
      setCheckingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050816] text-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!prospect) {
    return (
      <div className="min-h-screen bg-[#050816] text-white flex items-center justify-center p-6">
        <Card className="bg-white/5 border-white/10 p-8 max-w-md text-center">
          <p className="text-zinc-300">Profil entrepreneur introuvable.</p>
        </Card>
      </div>
    );
  }

  const score = prospect.aipp_score ?? 50;
  const scoreColor =
    score >= 70 ? "text-emerald-400" :
    score >= 40 ? "text-amber-400" : "text-red-400";

  return (
    <>
      <Helmet>
        <title>{prospect.business_name} · Activer vos rendez-vous exclusifs · UNPRO</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen bg-[#050816] text-white">
        {/* Background layers */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-3xl mx-auto px-6 py-12 space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-blue-300">
              <Sparkles className="w-3.5 h-3.5" /> Analyse UNPRO
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              {prospect.business_name}
            </h1>
            <p className="text-zinc-400 text-sm">
              {prospect.trade ?? "Entrepreneur"} · {prospect.city ?? "Québec"}
            </p>
          </div>

          {/* AIPP Score */}
          <Card className="bg-white/5 border-white/10 p-6 rounded-3xl">
            <div className="text-xs uppercase tracking-wider text-zinc-400 mb-2">Score AIPP — Visibilité IA</div>
            <div className="flex items-baseline gap-3">
              <span className={`text-6xl font-semibold font-mono ${scoreColor}`}>{Math.round(score)}</span>
              <span className="text-zinc-500">/100</span>
            </div>
            <div className="mt-3 h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-amber-500" : "bg-red-500"
                }`}
                style={{ width: `${score}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
              <div>
                <div className="text-xs text-zinc-400 mb-1">Forces détectées</div>
                <ul className="space-y-1">
                  {(snapshot?.strengths ?? [
                    `${prospect.review_count ?? 0} avis Google`,
                    prospect.rbq ? "RBQ vérifié" : "Présence locale",
                    prospect.website_url ? "Site web actif" : "Identité de marque",
                  ]).slice(0, 3).map((s, i) => (
                    <li key={i} className="text-emerald-300 text-xs">✓ {s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-xs text-zinc-400 mb-1">Opportunités</div>
                <ul className="space-y-1">
                  {(snapshot?.weaknesses ?? [
                    "Visibilité IA limitée",
                    "Territoire sous-exploité",
                    "Capacité non monétisée",
                  ]).slice(0, 3).map((s, i) => (
                    <li key={i} className="text-amber-300 text-xs">→ {s}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          {/* Objective */}
          <Card className="bg-white/5 border-white/10 p-6 rounded-3xl">
            <div className="flex items-center gap-2 text-sm font-semibold mb-3">
              <Target className="w-4 h-4 text-blue-400" />
              Quel est votre objectif ?
            </div>
            <div className="grid grid-cols-2 gap-2">
              {OBJECTIVES.map((o) => (
                <button
                  key={o.key}
                  onClick={() => setObjective(o.key)}
                  className={`p-3 rounded-2xl text-sm text-left transition border ${
                    objective === o.key
                      ? "bg-blue-500/20 border-blue-500/50 text-white"
                      : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </Card>

          {/* Capacity */}
          <Card className="bg-white/5 border-white/10 p-6 rounded-3xl">
            <div className="flex items-center gap-2 text-sm font-semibold mb-3">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              Capacité mensuelle souhaitée
            </div>
            <div className="text-3xl font-semibold text-blue-300 mb-3">
              {capacity} <span className="text-sm text-zinc-400 font-normal">rendez-vous/mois</span>
            </div>
            <Slider
              value={[capacity]}
              onValueChange={(v) => setCapacity(v[0])}
              min={1}
              max={60}
              step={1}
            />
          </Card>

          {/* Plan recommended */}
          <Card className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-blue-500/30 p-6 rounded-3xl">
            <div className="text-xs uppercase tracking-wider text-blue-300 mb-1">
              Plan recommandé par l'IA
            </div>
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-3xl font-semibold">{planDef.name}</div>
                {planDef.appts > 0 && (
                  <div className="text-sm text-zinc-300 mt-1">
                    {planDef.appts} rendez-vous exclusifs garantis/mois
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-3xl font-semibold text-blue-300">{planDef.price}$</div>
                <div className="text-xs text-zinc-400">/mois</div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-zinc-400">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              Territoire exclusif · Pas de rendez-vous partagés
            </div>
          </Card>

          {/* CTA */}
          <Button
            onClick={startCheckout}
            disabled={checkingOut}
            className="w-full h-14 text-base font-semibold bg-blue-500 hover:bg-blue-600 rounded-2xl"
          >
            {checkingOut ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Sparkles className="w-5 h-5 mr-2" />
            )}
            Activer mes rendez-vous exclusifs
          </Button>

          <p className="text-center text-xs text-zinc-500">
            Paiement sécurisé via Stripe · Annulation en tout temps
          </p>
        </div>
      </div>
    </>
  );
}
