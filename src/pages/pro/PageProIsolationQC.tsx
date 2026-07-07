/**
 * /isolation-qc — First-Dollar Sprint landing.
 *
 * Rebuilt around one question: "Votre entreprise mérite-t-elle d'être
 * recommandée par l'IA d'UNPRO ?". Answer in the fold with 3 stats
 * (revenu potentiel, villes couvertes, demande en attente), then $1/7-day
 * trial CTA. Stats race a 800ms timeout — the landing never blocks.
 */
import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams } from "react-router-dom";
import { ArrowRight, TrendingUp, MapPin, Zap, ShieldCheck, Target, Award, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { redirectToCheckout } from "@/lib/redirectToCheckout";

const SPRINT_SLUG = "sprint-isolation-qc";
const CATEGORY = "isolation";
const STATS_TIMEOUT_MS = 800;

interface LandingStats {
  revenue: string;
  cities: string;
  demand: string;
  hasReal: boolean;
}

const FALLBACK_STATS: LandingStats = {
  revenue: "5 000 – 15 000 $/mois",
  cities: "12 villes",
  demand: "24 projets",
  hasReal: false,
};

async function logEvent(event: string, payload: Record<string, unknown>) {
  try {
    await (supabase as any).from("first_dollar_sprint_events").insert({
      event,
      campaign_variant: (payload.camp as string) ?? null,
      city: (payload.city as string) ?? null,
      category: CATEGORY,
      session_id: (payload.session_id as string) ?? null,
      metadata: payload,
    });
  } catch {
    /* best-effort */
  }
}

/** Race a Supabase count against a hard timeout so the fold never stalls. */
async function fetchLandingStats(city: string): Promise<LandingStats> {
  const timeout = new Promise<LandingStats>((resolve) =>
    setTimeout(() => resolve(FALLBACK_STATS), STATS_TIMEOUT_MS),
  );

  const real = (async (): Promise<LandingStats> => {
    try {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const [projectsRes] = await Promise.all([
        (supabase as any)
          .from("projects")
          .select("id", { count: "exact", head: true })
          .gte("created_at", since),
      ]);
      const demand = projectsRes?.count ?? null;
      return {
        revenue: "5 000 – 15 000 $/mois",
        cities: city ? `${city.replace(/-/g, " ")} + 4 secteurs` : "12 villes",
        demand: demand && demand > 0 ? `${demand} projets` : FALLBACK_STATS.demand,
        hasReal: true,
      };
    } catch {
      return FALLBACK_STATS;
    }
  })();

  return Promise.race([real, timeout]);
}

export default function PageProIsolationQC() {
  const [params] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [stats, setStats] = useState<LandingStats>(FALLBACK_STATS);

  const utm = useMemo(
    () => ({
      src: params.get("src") ?? "direct",
      camp: params.get("camp") ?? "",
      city: params.get("city") ?? "",
      company: params.get("company") ?? "",
    }),
    [params],
  );

  useEffect(() => {
    logEvent("landing_viewed", { ...utm, has_stats: false });
    fetchLandingStats(utm.city).then((s) => {
      setStats(s);
      logEvent("stats_loaded", {
        ...utm,
        revenue: s.revenue,
        cities: s.cities,
        demand: s.demand,
        real: s.hasReal,
      });
    });
  }, [utm]);

  const activate = async () => {
    logEvent("cta_clicked", utm);
    setLoading(true);
    setErr(null);
    try {
      const { data, error } = await supabase.functions.invoke(
        "create-activation-checkout",
        { body: { slug: SPRINT_SLUG, source: "isolation-qc", utm } },
      );
      if (error || !data?.url) {
        setErr("Activation temporairement indisponible — réessayez dans 10 secondes.");
        return;
      }
      redirectToCheckout(data.url);
    } catch {
      setErr("Activation temporairement indisponible — réessayez dans 10 secondes.");
    } finally {
      setLoading(false);
    }
  };

  const cityLabel = utm.city ? utm.city.replace(/-/g, " ") : "Québec";

  return (
    <div className="min-h-screen bg-[#0B1220] text-white flex items-start sm:items-center justify-center px-5 py-8 sm:py-10">
      <Helmet>
        <title>Être recommandé par l'IA d'UNPRO — 1 $ pour 7 jours</title>
        <meta
          name="description"
          content="Votre entreprise mérite-t-elle d'être recommandée par l'IA d'UNPRO ? Voyez votre revenu potentiel, vos villes couvertes et la demande en attente. Essai 7 jours pour 1 $."
        />
      </Helmet>

      <main className="w-full max-w-md">
        <div className="mb-4 text-[11px] uppercase tracking-widest text-white/50">
          UNPRO · Recommandation IA · {cityLabel}
        </div>

        <h1
          className="text-[28px] sm:text-[34px] font-extrabold leading-[1.08] mb-3"
          style={{ letterSpacing: "-0.03em" }}
        >
          Votre entreprise mérite-t-elle d'être recommandée par l'IA d'UNPRO ?
        </h1>

        <p className="text-[14.5px] text-white/70 mb-5 leading-relaxed">
          Nous analysons votre expertise, votre territoire et votre capacité
          pour vous recommander au bon client, au bon moment.
        </p>

        {/* 3-stat proof strip */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <StatCard
            icon={<TrendingUp className="w-3.5 h-3.5 text-emerald-300" />}
            label="Revenu potentiel"
            value={stats.revenue}
          />
          <StatCard
            icon={<MapPin className="w-3.5 h-3.5 text-sky-300" />}
            label="Villes couvertes"
            value={stats.cities}
          />
          <StatCard
            icon={<Zap className="w-3.5 h-3.5 text-amber-300" />}
            label="Demande en attente"
            value={stats.demand}
          />
        </div>

        <button
          onClick={activate}
          disabled={loading}
          className="w-full rounded-2xl bg-white text-[#0B1220] font-semibold text-[16px] py-4 flex items-center justify-center gap-2 hover:bg-white/95 transition disabled:opacity-60"
        >
          {loading ? "Préparation…" : (
            <>
              Activer mon essai — 1 $ pour 7 jours <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>

        <p className="mt-2.5 text-[11.5px] text-center text-white/50">
          Aucun engagement · Annulation en 1 clic · Paiement Stripe
        </p>

        {err && <p className="mt-3 text-[13px] text-rose-300 text-center">{err}</p>}

        {/* 4 micro-benefits */}
        <ul className="mt-7 space-y-2.5 text-[13.5px] text-white/75">
          <Benefit icon={<Target className="w-4 h-4 text-emerald-300" />}
            text="Recommandé au bon moment, pas noyé dans une liste" />
          <Benefit icon={<ShieldCheck className="w-4 h-4 text-emerald-300" />}
            text="Territoire respecté, pas revendu à 5 concurrents" />
          <Benefit icon={<Award className="w-4 h-4 text-emerald-300" />}
            text="Score IA visible sur votre fiche" />
          <Benefit icon={<Calendar className="w-4 h-4 text-emerald-300" />}
            text="Rendez-vous, pas des leads froids" />
        </ul>

        <p className="mt-8 text-[11px] text-white/40 text-center">
          UNPRO · Passeport Maison · Québec
        </p>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2.5 flex flex-col gap-1">
      <div className="flex items-center gap-1">
        {icon}
        <span className="text-[9.5px] uppercase tracking-wider text-white/45">{label}</span>
      </div>
      <div className="text-[12.5px] font-semibold text-white leading-tight">{value}</div>
    </div>
  );
}

function Benefit({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="shrink-0 mt-0.5">{icon}</span>
      <span>{text}</span>
    </li>
  );
}
