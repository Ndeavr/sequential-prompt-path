/**
 * UNPRO — Unlock Landing Page
 * Dynamic intent-based landing page for QR scans and shared links.
 * Supports all intents including ambassador-lifetime with scarcity.
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
import {
  Crown, Shield, Star, Zap, TrendingUp, Check,
  ChefHat, Bath, Search, AlertTriangle, Palette, Building2, UserPlus, Award, Sparkles,
  ArrowRight,
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
    () => QR_INTENTS.find((i) => i.slug === intentSlug) || QR_INTENTS[4], // default to ai-design
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
    if (user) {
      navigate(intent.destinationPath);
    } else {
      // Store intent for post-login redirect
      try {
        sessionStorage.setItem("unpro_auth_intent", JSON.stringify({
          returnTo: intent.destinationPath,
          intent: intentSlug,
        }));
      } catch {}
      navigate("/signup");
    }
  };

  if (isAmbassador) {
    return <AmbassadorLanding intent={intent} offerStatus={offerStatus} onCTA={handleCTA} />;
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
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md text-center"
        >
          {/* Icon */}
          <div className={`h-20 w-20 rounded-3xl mx-auto mb-6 flex items-center justify-center bg-gradient-to-br ${intent.gradient} ring-1 ring-border/10 shadow-lg`}>
            <Icon className="h-10 w-10 text-primary" />
          </div>

          {/* Badge */}
          {intent.badge && (
            <Badge className="mb-4 bg-primary/10 text-primary border-0 text-xs">{intent.badge}</Badge>
          )}

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-display leading-tight mb-3">
            {intent.subtitleFr}
          </h1>

          {/* Copy */}
          <p className="text-base text-muted-foreground leading-relaxed mb-8 max-w-sm mx-auto">
            {randomCopy}
          </p>

          {/* CTA */}
          <Button
            onClick={onCTA}
            size="lg"
            className="rounded-full px-8 h-12 text-base font-semibold gap-2 shadow-lg shadow-primary/20"
          >
            {intent.ctaFr}
            <ArrowRight className="h-4 w-4" />
          </Button>

          {!isAuthenticated && (
            <p className="text-xs text-muted-foreground mt-4">
              Déjà membre ? <Link to="/login" className="text-primary hover:underline">Connexion</Link>
            </p>
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
}: {
  intent: QrIntent;
  offerStatus: { remaining: number; totalSlots: number } | null;
  onCTA: () => void;
}) {
  const remaining = offerStatus?.remaining ?? 50;
  const total = offerStatus?.totalSlots ?? 50;
  const percentUsed = ((total - remaining) / total) * 100;

  const benefits = [
    { icon: Shield, label: "Aucun frais mensuel — à vie" },
    { icon: Star, label: "Badge Ambassadeur vérifié" },
    { icon: Zap, label: "Priorité dans les résultats de recherche" },
    { icon: TrendingUp, label: "Visibilité premium garantie" },
  ];

  const steps = [
    { step: "1", title: "Réserve ta place", desc: "Inscris-toi pour sécuriser l'offre." },
    { step: "2", title: "Complète ton profil", desc: "Ajoute tes services et ta zone." },
    { step: "3", title: "Reçois des rendez-vous", desc: "Les clients te trouvent directement." },
  ];

  return (
    <MainLayout>
      <div className="min-h-screen">
        {/* Hero */}
        <section className="relative overflow-hidden px-4 py-16 sm:py-24">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-transparent" />
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="relative max-w-lg mx-auto text-center"
          >
            <div className="h-20 w-20 rounded-3xl mx-auto mb-6 flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-yellow-500/10 shadow-[0_0_30px_-6px_hsl(38_92%_50%/0.3)] ring-1 ring-amber-500/20">
              <Crown className="h-10 w-10 text-amber-500" />
            </div>

            <Badge className="mb-4 bg-amber-500/15 text-amber-600 dark:text-amber-400 border-0 text-xs font-bold">
              Offre limitée — {remaining} / {total} places restantes
            </Badge>

            <h1 className="text-3xl sm:text-4xl font-bold text-foreground font-display leading-tight mb-4">
              T'aimerais ça pas avoir à payer de frais mensuels… <span className="text-amber-500">jamais</span> ?
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed mb-6 max-w-md mx-auto">
              Offre spéciale réservée aux prochains {remaining} entrepreneurs.
            </p>
          </motion.div>
        </section>

        {/* Scarcity counter */}
        <section className="px-4 pb-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="max-w-md mx-auto"
          >
            <div className="rounded-2xl bg-card border border-amber-500/10 p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-foreground">Places restantes</span>
                <span className="text-2xl font-bold text-amber-500 font-display">{remaining}</span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentUsed}%` }}
                  transition={{ delay: 0.5, duration: 1.2, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {total - remaining} entrepreneurs ont déjà réclamé leur place
              </p>
            </div>
          </motion.div>
        </section>

        {/* Benefits */}
        <section className="px-4 pb-12">
          <div className="max-w-md mx-auto">
            <h2 className="text-xl font-bold text-foreground font-display text-center mb-6">
              Ce que tu obtiens
            </h2>
            <div className="space-y-3">
              {benefits.map((b, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/20"
                >
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                    <b.icon className="h-5 w-5 text-amber-500" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{b.label}</span>
                  <Check className="h-4 w-4 text-success ml-auto shrink-0" />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="px-4 pb-12">
          <div className="max-w-md mx-auto">
            <h2 className="text-xl font-bold text-foreground font-display text-center mb-6">
              Comment ça marche
            </h2>
            <div className="space-y-4">
              {steps.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.15 }}
                  className="flex items-start gap-4"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
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
        <section className="px-4 pb-16">
          <div className="max-w-md mx-auto text-center">
            <Button
              onClick={onCTA}
              size="lg"
              className="rounded-full px-10 h-14 text-base font-bold gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white shadow-xl shadow-amber-500/25"
            >
              <Crown className="h-5 w-5" />
              Réserver ma place
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              Aucun paiement requis. Crée ton profil et l'offre est activée.
            </p>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
