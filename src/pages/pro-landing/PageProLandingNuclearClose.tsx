/**
 * PageProLandingNuclearClose — Personalized landing for sniper-email prospects.
 *
 * URL: /pro/:slug   (also accepts ?t=<tracking_token> for click attribution)
 *
 * RULES:
 * - Female premium voice (Charlotte FR / Sarah EN), audio-on-tap (browser policy)
 * - Visible value in <5s: dynamic score cards, missed-leads chart, premium hero
 * - Three CTAs: Book Strategy Call (Phase 2 → Pricing), Join Now, Founder Offer
 * - Glassmorphism, dark by default, aura gradients, subtle motion
 * - Logs every view + CTA click to pro_landing_views
 */
import { Helmet } from "react-helmet-async";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Volume2,
  VolumeX,
  ArrowRight,
  Sparkles,
  TrendingDown,
  ShieldCheck,
  Zap,
  Crown,
  MessageCircle,
} from "lucide-react";
import {
  useNuclearCloseFemaleVoice,
  resolveProspect,
  logProLandingCta,
} from "@/hooks/useNuclearCloseFemaleVoice";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Prospect = NonNullable<Awaited<ReturnType<typeof resolveProspect>>>;

const CATEGORY_LABEL_FR: Record<string, string> = {
  toiture: "toiture",
  asphalte: "asphalte",
  gazon: "entretien de gazon",
  peinture: "peinture",
};

function buildIntroScript(p: Prospect) {
  const cat = CATEGORY_LABEL_FR[p.category] ?? p.category;
  return `Bonjour ${p.company_name}. J'ai analysé votre présence en ligne à ${p.city}. ` +
    `Pour une entreprise de ${cat}, votre score de visibilité est de ${p.scores.visibility} sur cent. ` +
    `Vous laissez environ ${p.scores.missed} opportunités qualifiées par mois sur la table. ` +
    `J'ai une solution exclusive. Voulez-vous le résumé en soixante secondes ?`;
}

function ScoreCard({
  label,
  value,
  icon,
  accent,
  delay,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Card className="relative overflow-hidden border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{ background: accent }}
          aria-hidden
        />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-white/60">
              {label}
            </p>
            <p className="mt-2 text-3xl font-semibold text-white tabular-nums">
              {value}
              <span className="text-sm text-white/50">/100</span>
            </p>
          </div>
          <div className="text-white/70">{icon}</div>
        </div>
        <div className="relative mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60"
            initial={{ width: 0 }}
            animate={{ width: `${value}%` }}
            transition={{ duration: 1, delay: delay + 0.2, ease: "easeOut" }}
          />
        </div>
      </Card>
    </motion.div>
  );
}

function MissedLeadsChart({ missed }: { missed: number }) {
  // 12-month bars trending up to "missed"
  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const factor = 0.55 + (i / 11) * 0.45;
      return Math.max(2, Math.round(missed * factor));
    });
  }, [missed]);
  const max = Math.max(...months);
  return (
    <Card className="border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-white/60">
            Opportunités manquées (mensuel)
          </p>
          <p className="mt-1 text-4xl font-semibold text-white tabular-nums">
            ~{missed}
          </p>
          <p className="mt-1 flex items-center gap-1 text-sm text-rose-300">
            <TrendingDown className="h-3.5 w-3.5" />
            Tendance qui s'aggrave
          </p>
        </div>
        <div className="rounded-full bg-rose-500/10 px-3 py-1 text-xs text-rose-200">
          12 derniers mois
        </div>
      </div>
      <div className="mt-6 flex h-24 items-end gap-1.5">
        {months.map((v, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: `${(v / max) * 100}%` }}
            transition={{ duration: 0.6, delay: 0.4 + i * 0.04 }}
            className="flex-1 rounded-sm bg-gradient-to-t from-rose-500/40 to-rose-300/80"
          />
        ))}
      </div>
    </Card>
  );
}

export default function PageProLandingNuclearClose() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("t");
  const navigate = useNavigate();
  const { speak, stop, isSpeaking, hasError } = useNuclearCloseFemaleVoice();
  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [voiceArmed, setVoiceArmed] = useState(false);
  const [voiceAttempted, setVoiceAttempted] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setNotFound(false);
    resolveProspect({ slug, token })
      .then((p) => {
        if (!alive) return;
        if (!p) setNotFound(true);
        else setProspect(p);
      })
      .catch((err) => {
        console.error(err);
        if (alive) setNotFound(true);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [slug, token]);

  // Auto-arm: try to autoplay, if blocked we show "Activer la voix" prompt
  useEffect(() => {
    if (!prospect || voiceAttempted) return;
    setVoiceAttempted(true);
    const script = buildIntroScript(prospect);
    speak(script, { language: "fr" })
      .then(() => setVoiceArmed(true))
      .catch(() => setVoiceArmed(false));
  }, [prospect, voiceAttempted, speak]);

  const handleCta = (cta: string, route: string) => {
    if (prospect) logProLandingCta(prospect.id, cta).catch(() => {});
    stop();
    navigate(route);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060B14]">
        <p className="animate-pulse text-white/60">Préparation de votre analyse…</p>
      </div>
    );
  }

  if (notFound || !prospect) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#060B14] px-6 text-center">
        <h1 className="text-2xl font-semibold text-white">Lien expiré</h1>
        <p className="max-w-md text-white/60">
          Cette analyse personnalisée n'est plus disponible. Découvrez UNPRO
          sur notre page principale.
        </p>
        <Link to="/entrepreneurs" className="text-primary underline">
          Voir UNPRO pour entrepreneurs
        </Link>
      </div>
    );
  }

  const intro = buildIntroScript(prospect);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#060B14] text-white">
      <Helmet>
        <title>{prospect.company_name} — Analyse UNPRO Laval</title>
        <meta
          name="description"
          content={`Analyse personnalisée pour ${prospect.company_name} : visibilité, conversion et opportunités manquées à ${prospect.city}.`}
        />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      {/* Aura backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 40% at 20% 10%, hsl(var(--primary)/0.18), transparent 70%), radial-gradient(50% 35% at 85% 5%, hsl(280 80% 60%/0.12), transparent 70%), radial-gradient(45% 30% at 50% 100%, hsl(200 90% 55%/0.10), transparent 70%)",
        }}
      />

      <main className="relative mx-auto max-w-6xl px-5 pb-16 pt-10 md:pt-16">
        {/* Top trust bar */}
        <div className="mb-8 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wider text-white/50">
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
            Québec · Laval
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
            Analyse IA · Live
          </span>
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-200">
            Territoire exclusif
          </span>
        </div>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl"
        >
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/70">
            <Sparkles className="h-3 w-3 text-primary" />
            Préparé pour {prospect.company_name}
          </p>
          <h1 className="text-balance text-3xl font-semibold leading-tight md:text-5xl">
            {prospect.company_name}, vous perdez probablement de la demande
            locale à {prospect.city}.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-white/70 md:text-lg">
            UNPRO aide les entrepreneurs en {CATEGORY_LABEL_FR[prospect.category] ?? prospect.category}{" "}
            à recevoir des rendez-vous qualifiés et exclusifs — pas des soumissions
            partagées au rabais.
          </p>
        </motion.div>

        {/* Voice bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl"
        >
          <div className="relative h-10 w-10 shrink-0">
            <div
              className={`absolute inset-0 rounded-full bg-gradient-to-br from-primary to-fuchsia-400 ${
                isSpeaking ? "animate-ping" : ""
              } opacity-40`}
            />
            <div className="absolute inset-1 grid place-items-center rounded-full bg-gradient-to-br from-primary to-fuchsia-500 text-sm font-semibold">
              A
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wider text-white/50">
              Alex · Analyse vocale en direct
            </p>
            <p className="truncate text-sm text-white/85">
              {isSpeaking ? "En train de vous parler…" : voiceArmed ? "Audio prêt" : "Touchez pour activer le son"}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              isSpeaking
                ? stop()
                : speak(intro, { language: "fr" }).then(() => setVoiceArmed(true))
            }
            className="bg-white/10 text-white hover:bg-white/20"
          >
            {isSpeaking ? (
              <>
                <VolumeX className="mr-1.5 h-4 w-4" /> Couper
              </>
            ) : (
              <>
                <Volume2 className="mr-1.5 h-4 w-4" /> Écouter
              </>
            )}
          </Button>
          {hasError && (
            <p className="w-full text-xs text-rose-300">
              Audio indisponible — la lecture du contenu reste accessible ci-dessous.
            </p>
          )}
        </motion.div>

        {/* Score grid */}
        <section className="mt-10">
          <h2 className="mb-4 text-xs uppercase tracking-wider text-white/50">
            Votre diagnostic en 5 dimensions
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <ScoreCard
              label="Visibilité"
              value={prospect.scores.visibility}
              icon={<Sparkles className="h-4 w-4" />}
              accent="radial-gradient(60% 80% at 50% 0%, hsl(var(--primary)/0.35), transparent 70%)"
              delay={0.05}
            />
            <ScoreCard
              label="Confiance"
              value={prospect.scores.trust}
              icon={<ShieldCheck className="h-4 w-4" />}
              accent="radial-gradient(60% 80% at 50% 0%, hsl(140 70% 55%/0.30), transparent 70%)"
              delay={0.12}
            />
            <ScoreCard
              label="Conversion"
              value={prospect.scores.conversion}
              icon={<TrendingDown className="h-4 w-4 rotate-180" />}
              accent="radial-gradient(60% 80% at 50% 0%, hsl(40 90% 60%/0.30), transparent 70%)"
              delay={0.19}
            />
            <ScoreCard
              label="Vitesse"
              value={prospect.scores.speed}
              icon={<Zap className="h-4 w-4" />}
              accent="radial-gradient(60% 80% at 50% 0%, hsl(200 90% 60%/0.30), transparent 70%)"
              delay={0.26}
            />
            <ScoreCard
              label="Opportunité"
              value={prospect.scores.opportunity}
              icon={<Crown className="h-4 w-4" />}
              accent="radial-gradient(60% 80% at 50% 0%, hsl(320 90% 65%/0.32), transparent 70%)"
              delay={0.33}
            />
          </div>
        </section>

        {/* Missed leads chart */}
        <section className="mt-6">
          <MissedLeadsChart missed={prospect.scores.missed} />
        </section>

        {/* CTAs */}
        <section className="mt-10 grid gap-3 md:grid-cols-3">
          <Card
            className="group cursor-pointer border-primary/30 bg-gradient-to-br from-primary/15 to-primary/5 p-6 backdrop-blur-xl transition hover:from-primary/25"
            onClick={() =>
              handleCta("join_now", "/pricing/entrepreneurs?from=nuclear&utm_source=sniper")
            }
          >
            <p className="text-xs uppercase tracking-wider text-white/60">
              Recommandé
            </p>
            <h3 className="mt-1 text-xl font-semibold">Rejoindre maintenant</h3>
            <p className="mt-1 text-sm text-white/70">
              Activez votre territoire exclusif. Rendez-vous qualifiés dès cette
              semaine.
            </p>
            <div className="mt-4 inline-flex items-center text-sm font-medium text-primary">
              Voir les plans <ArrowRight className="ml-1 h-4 w-4 transition group-hover:translate-x-0.5" />
            </div>
          </Card>

          <Card
            className="group cursor-pointer border-amber-400/20 bg-gradient-to-br from-amber-400/15 to-amber-400/5 p-6 backdrop-blur-xl transition hover:from-amber-400/25"
            onClick={() =>
              handleCta("founder_offer", "/founder?from=nuclear&utm_source=sniper")
            }
          >
            <p className="text-xs uppercase tracking-wider text-amber-200/80">
              30 places maximum
            </p>
            <h3 className="mt-1 text-xl font-semibold">Offre Fondateur</h3>
            <p className="mt-1 text-sm text-white/70">
              Paiement unique. Avantage 10 ans. Priorité territoire.
            </p>
            <div className="mt-4 inline-flex items-center text-sm font-medium text-amber-200">
              Vérifier la disponibilité <ArrowRight className="ml-1 h-4 w-4" />
            </div>
          </Card>

          <Card
            className="group cursor-pointer border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl transition hover:bg-white/[0.07]"
            onClick={() => handleCta("ask_questions", "/alex?from=nuclear")}
          >
            <p className="text-xs uppercase tracking-wider text-white/60">
              Pas pressé ?
            </p>
            <h3 className="mt-1 text-xl font-semibold">Poser des questions</h3>
            <p className="mt-1 text-sm text-white/70">
              Discutez avec Alex. Aucune pression. Aucune carte requise.
            </p>
            <div className="mt-4 inline-flex items-center text-sm font-medium text-white/80">
              Démarrer la conversation{" "}
              <MessageCircle className="ml-1 h-4 w-4" />
            </div>
          </Card>
        </section>

        {/* Trust strip */}
        <section className="mt-10 grid grid-cols-2 gap-3 text-xs text-white/60 md:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            🛡️ Aucune soumission partagée
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            🎯 Opportunités exclusives
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            ⚡ IA québécoise
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            🔒 Territoire limité
          </div>
        </section>
      </main>
    </div>
  );
}
