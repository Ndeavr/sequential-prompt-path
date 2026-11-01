/**
 * UNPRO — Unlock Landing Page
 * Dynamic intent-based landing page for QR scans and shared links.
 * New users are prompted to create a free account before continuing.
 */
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MainLayout from "@/layouts/MainLayout";
import { QR_INTENTS, type QrIntent } from "@/config/qrIntents";
import { logQrScan, getAmbassadorOfferStatus } from "@/services/qrSharing";
import { captureAttribution } from "@/hooks/useReferralAttribution";
import { useAuth } from "@/hooks/useAuth";
import { saveAuthIntent } from "@/services/auth/authIntentService";
import {
  Crown, Shield, Star, Zap, TrendingUp, Check,
  ChefHat, Bath, Search, AlertTriangle, Palette, Building2, UserPlus, Award, Sparkles,
  ArrowRight, Lock,
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  ChefHat, Bath, Search, AlertTriangle, Palette, Building2, UserPlus, Award, Crown, Sparkles,
};

const UnlockPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const intentSlug = params.get("intent") || "ai-design";
  const referrerId = params.get("referrer_id");
  const variant = params.get("variant") || "a";
  const source = params.get("source") || "link";

  const intent = useMemo(
    () => QR_INTENTS.find((i) => i.slug === intentSlug) || QR_INTENTS[4],
    [intentSlug]
  );

  const isAmbassador = intentSlug === "ambassador-lifetime";
  const [offerStatus, setOfferStatus] = useState<{ remaining: number; totalSlots: number } | null>(null);

  // Track scan on mount
  useEffect(() => {
    logQrScan({ intentSlug, referrerUserId: referrerId || undefined, variant, sessionId: crypto.randomUUID() });
    captureAttribution(params);
  }, []);

  // Fetch ambassador scarcity
  useEffect(() => {
    if (isAmbassador) {
      getAmbassadorOfferStatus().then(setOfferStatus);
    }
  }, [isAmbassador]);

  const handleCTA = () => {
    const destination = isAmbassador
      ? "/contractor-onboarding?offer=ambassador-lifetime"
      : intent.destinationPath;
    if (user) {
      navigate(destination);
    } else {
      // Save intent so user is redirected after signup/login
      saveAuthIntent({
        returnPath: destination,
        action: "unlock_intent",
        metadata: { intent: intentSlug, referrerId, variant },
      });
      navigate("/signup");
    }
  };

  if (isAmbassador) {
    return <AmbassadorLanding intent={intent} offerStatus={offerStatus} onCTA={handleCTA} isAuthenticated={!!user} />;
  }

  return <GenericIntentLanding intent={intent} onCTA={handleCTA} isAuthenticated={!!user} />;
};

export default UnlockPage;

/* ─── Generic Intent Landing ─── */

function GenericIntentLanding({
  intent,
  onCTA,
  isAuthenticated,
}: {
  intent: QrIntent;
  onCTA: () => void;
  isAuthenticated: boolean;
}) {
  const Icon = ICON_MAP[intent.icon] || Sparkles;
  const randomCopy = intent.copyVariants[0];

  return (
    <MainLayout>
      <div className="min-h-[85vh] flex flex-col items-center justify-center px-5 py-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm text-center"
        >
          {/* Icon */}
          <div className={`h-16 w-16 rounded-2xl mx-auto mb-5 flex items-center justify-center bg-gradient-to-br ${intent.gradient} ring-1 ring-border/10 shadow-lg`}>
            <Icon className="h-8 w-8 text-primary" />
          </div>

          {/* Badge */}
          {intent.badge && (
            <Badge className="mb-3 bg-primary/10 text-primary border-0 text-[11px]">{intent.badge}</Badge>
          )}

          {/* Title */}
          <h1 className="text-xl sm:text-2xl font-bold text-foreground font-display leading-tight mb-2">
            {intent.subtitleFr}
          </h1>

          {/* Copy */}
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            {randomCopy}
          </p>

          {/* CTA */}
          <Button
            onClick={onCTA}
            size="lg"
            className="w-full rounded-2xl h-12 text-base font-semibold gap-2 shadow-lg shadow-primary/20"
          >
            {isAuthenticated ? (
              <>
                {intent.ctaFr}
                <ArrowRight className="h-4 w-4" />
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Créer mon compte gratuit
              </>
            )}
          </Button>

          {!isAuthenticated && (
            <p className="text-xs text-muted-foreground mt-3">
              Déjà membre ?{" "}
              <Link to="/login" className="text-primary font-medium hover:underline">
                Connexion
              </Link>
            </p>
          )}

          {/* Trust signals */}
          {!isAuthenticated && (
            <div className="mt-8 flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Gratuit</span>
              <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> 30 secondes</span>
              <span className="flex items-center gap-1"><Check className="h-3 w-3" /> Sans engagement</span>
            </div>
          )}
        </motion.div>
      </div>
    </MainLayout>
  );
}

/* ─── Ambassador Lifetime Landing ─── */

function AmbassadorLanding({
  intent,
  offerStatus,
  onCTA,
  isAuthenticated,
}: {
  intent: QrIntent;
  offerStatus: { remaining: number; totalSlots: number } | null;
  onCTA: () => void;
  isAuthenticated: boolean;
}) {
  const isSoldOut = offerStatus !== null && offerStatus.remaining <= 0;

  const benefits = [
    { icon: Shield, label: "Aucun frais mensuel — à vie" },
    { icon: Star, label: "Profil d’entreprise et présence IA UNPRO" },
    { icon: Zap, label: "Rendez-vous exclusifs qualifiés inclus annuellement" },
    { icon: TrendingUp, label: "Volume annuel établi selon votre marché" },
  ];

  const steps = [
    { step: "1", title: "Présentez votre entreprise", desc: "Précisez votre région, vos spécialités et votre capacité." },
    { step: "2", title: "Obtenez votre offre personnalisée", desc: "Le nombre annuel de rendez-vous et les conditions sont confirmés avant tout paiement." },
    { step: "3", title: "Confirmez votre adhésion", desc: "Un paiement unique de 19 995 $ plus taxes applicables, selon les conditions de votre offre." },
  ];

  return (
    <MainLayout>
      <div className="min-h-screen">
        {/* Hero */}
        <section className="relative overflow-hidden px-5 pt-12 pb-8">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-transparent" />
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative max-w-2xl mx-auto text-center"
          >
            <div className="h-16 w-16 rounded-2xl mx-auto mb-5 flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-yellow-500/10 shadow-[0_0_30px_-6px_hsl(38_92%_50%/0.3)] ring-1 ring-amber-500/20">
              <Crown className="h-8 w-8 text-amber-500" />
            </div>

            <Badge className="mb-3 bg-amber-500/15 text-amber-600 dark:text-amber-400 border-0 text-[11px] font-bold">
              Offre limitée à 50 entreprises
            </Badge>

            <h1 className="text-2xl font-bold text-foreground font-display leading-tight mb-3">
              Votre place parmi les <span className="text-amber-500">50 entreprises partenaires</span>.
            </h1>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Un investissement unique. Des rendez-vous exclusifs qualifiés inclus chaque année.
            </p>
          </motion.div>
        </section>

        <section className="px-5 pb-8">
          <div className="max-w-2xl mx-auto rounded-2xl bg-card border border-amber-500/20 p-6 sm:p-8 text-center">
            <p className="text-sm text-muted-foreground mb-2">Paiement unique</p>
            <p className="text-4xl sm:text-5xl font-bold text-amber-500 whitespace-nowrap">19 995 $</p>
            <p className="text-xs text-muted-foreground mt-2">CAD · plus taxes applicables · aucun frais mensuel pour l’offre incluse</p>
            <h2 className="text-lg font-semibold mt-6">Combien de rendez-vous par année ?</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              Le nombre de rendez-vous inclus annuellement dépend de votre région, de votre spécialité,
              des services recherchés et de votre capacité d’accueil. Votre volume annuel et les conditions
              applicables sont établis dans une offre personnalisée, avant tout paiement.
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              L’inscription gratuite ne réserve pas une place et n’active pas cette offre.
            </p>
          </div>
        </section>

        {/* Benefits */}
        <section className="px-5 pb-8">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-lg font-bold text-foreground font-display text-center mb-4">
              Ce que comprend votre offre
            </h2>
            <div className="space-y-2">
              {benefits.map((b, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/20"
                >
                  <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                    <b.icon className="h-4 w-4 text-amber-500" />
                  </div>
                  <span className="text-sm font-medium text-foreground flex-1">{b.label}</span>
                  <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="px-5 pb-8">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-lg font-bold text-foreground font-display text-center mb-4">
              Comment ça marche
            </h2>
            <div className="space-y-3">
              {steps.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                    {s.step}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-5 pb-12">
          <div className="max-w-2xl mx-auto text-center">
            <Button
              onClick={onCTA}
              disabled={isSoldOut}
              size="lg"
              className="w-full rounded-2xl h-12 text-base font-bold gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white shadow-xl shadow-amber-500/25"
            >
              {isAuthenticated ? (
                <>
                  <Crown className="h-5 w-5" />
                  {isSoldOut ? "Offre complète" : "Obtenir mon offre personnalisée"}
                </>
              ) : (
                <>
                  <Lock className="h-5 w-5" />
                  {isSoldOut ? "Offre complète" : "Créer mon compte pour obtenir mon offre"}
                </>
              )}
            </Button>
            <p className="text-[10px] text-muted-foreground mt-3">
              Aucun paiement à cette étape. Le volume annuel, les conditions et la disponibilité sont confirmés avant votre engagement.
            </p>

            {!isAuthenticated && (
              <p className="text-xs text-muted-foreground mt-2">
                Déjà membre ?{" "}
                <Link to="/login" className="text-primary font-medium hover:underline">
                  Connexion
                </Link>
              </p>
            )}
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
