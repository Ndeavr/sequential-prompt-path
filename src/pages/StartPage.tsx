/**
 * UNPRO — Smart Onboarding Page (/start)
 * No-password version: OAuth + Phone OTP
 */

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Home, Wrench, Users, Sparkles, FileCheck, Shield,
  ArrowRight, CheckCircle2, Eye, Lock,
} from "lucide-react";
import OAuthButtons from "@/components/auth/OAuthButtons";
import AuthDivider from "@/components/auth/AuthDivider";
import PhoneOtpForm from "@/components/auth/PhoneOtpForm";
import { saveAuthIntent, consumeAuthIntent, getDefaultRedirectForRole } from "@/services/auth/authIntentService";
import UnproIcon from "@/components/brand/UnproIcon";

const INTENT_TYPE_MAP: Record<string, "homeowner" | "contractor" | "ambassador"> = {
  "analyse-soumissions": "homeowner",
  "passeport-maison": "homeowner",
  "score-maison": "homeowner",
  "diagnostic": "homeowner",
  "upload-soumission": "homeowner",
  "matching": "homeowner",
  "rendez-vous": "contractor",
  "profil-entreprise": "contractor",
  "plans": "contractor",
  "ambassadeur": "ambassador",
};

const INTENT_REDIRECT_MAP: Record<string, string> = {
  "analyse-soumissions": "/dashboard/quotes/upload",
  "passeport-maison": "/dashboard/properties",
  "score-maison": "/dashboard/home-score",
  "diagnostic": "/alex?intent=diagnostic",
  "upload-soumission": "/dashboard/quotes/upload",
  "matching": "/matching",
  "rendez-vous": "/pro/leads",
  "profil-entreprise": "/pro/profile",
  "plans": "/pricing",
  "ambassadeur": "/ambassadeurs",
};

const USER_TYPES = [
  { key: "homeowner" as const, label: "Propriétaire", description: "Gérer ma propriété et mes projets", icon: Home, roleForDb: "homeowner", accountType: "homeowner" },
  { key: "contractor" as const, label: "Entrepreneur", description: "Développer mon entreprise et recevoir des rendez-vous exclusifs", icon: Wrench, roleForDb: "contractor", accountType: "contractor" },
  { key: "ambassador" as const, label: "Ambassadeur", description: "Recommander UNPRO et gagner des récompenses", icon: Users, roleForDb: "homeowner", accountType: "ambassador" },
];

const SOCIAL_PROOF = [
  { value: "2 400+", label: "propriétaires actifs" },
  { value: "8 500+", label: "soumissions analysées" },
  { value: "340+", label: "entrepreneurs vérifiés" },
];

const BENEFITS = [
  { icon: FileCheck, title: "Analyse intelligente", description: "IA qui compare vos soumissions et détecte les anomalies" },
  { icon: Shield, title: "Entrepreneurs certifiés", description: "Matching avec des professionnels vérifiés par UNPRO" },
  { icon: Eye, title: "Passeport Maison", description: "Le jumeau numérique de votre propriété, toujours à jour" },
];

export default function StartPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, role, isLoading } = useAuth();

  const intent = searchParams.get("intent") || "passeport-maison";
  const redirectTo = searchParams.get("redirect") || INTENT_REDIRECT_MAP[intent] || "/dashboard";

  const inferredType = INTENT_TYPE_MAP[intent] || "homeowner";
  const [selectedType, setSelectedType] = useState<"homeowner" | "contractor" | "ambassador">(inferredType);
  const [step, setStep] = useState<1 | 2>(1);

  // Save intent for post-auth redirect
  useEffect(() => {
    saveAuthIntent({ returnPath: redirectTo, action: intent, roleHint: inferredType });
  }, [redirectTo, intent, inferredType]);

  // If already authenticated, redirect
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const saved = consumeAuthIntent();
      navigate(saved?.returnPath || redirectTo, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, redirectTo]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full blur-[120px] opacity-30" style={{ background: "hsl(var(--primary))" }} />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full blur-[100px] opacity-20" style={{ background: "hsl(var(--secondary))" }} />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-4 py-12 sm:py-20">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center mb-10">
          <Link to="/" className="inline-block mb-6">
            <img src={logo} alt="UNPRO" className="h-16 w-16 mx-auto" />
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-display">
            Avant de continuer…
          </h1>
          <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
            UNPRO analyse votre projet, vos soumissions et votre maison pour vous éviter des erreurs coûteuses.
            <br />
            <span className="text-foreground font-medium">Aucun mot de passe requis.</span>
          </p>
        </motion.div>

        {/* Social Proof */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex justify-center gap-6 sm:gap-10 mb-12">
          {SOCIAL_PROOF.map((sp) => (
            <div key={sp.label} className="text-center">
              <div className="text-2xl font-bold text-foreground font-display">{sp.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{sp.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Step indicator */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mb-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Étape {step} sur 2</span>
            <span>{step === 1 ? "Choisir votre profil" : "Connexion rapide"}</span>
          </div>
          <Progress value={step === 1 ? 50 : 100} className="h-1.5" />
        </motion.div>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
              {/* User type selection */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                {USER_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = selectedType === type.key;
                  return (
                    <button
                      key={type.key}
                      onClick={() => setSelectedType(type.key)}
                      className={`relative p-5 rounded-xl border-2 transition-all duration-200 text-left group ${
                        isSelected ? "border-primary bg-primary/5 shadow-[var(--shadow-glow)]" : "border-border bg-card hover:border-primary/40"
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-primary" />}
                      <Icon className={`h-7 w-7 mb-3 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="font-semibold text-foreground">{type.label}</div>
                      <div className="text-sm text-muted-foreground mt-1">{type.description}</div>
                    </button>
                  );
                })}
              </div>

              {/* Alex micro-interaction */}
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="flex items-start gap-4 p-5 rounded-xl border border-border bg-card/80 backdrop-blur-sm mb-10">
                <div className="relative flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <motion.div className="absolute inset-0 rounded-full bg-primary/20" animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }} transition={{ duration: 2.5, repeat: Infinity }} />
                </div>
                <div>
                  <div className="font-semibold text-sm text-foreground">Alex — Assistant IA UNPRO</div>
                  <p className="text-sm text-muted-foreground mt-1">« Je peux analyser vos soumissions ou vous aider à trouver le bon entrepreneur. »</p>
                </div>
              </motion.div>

              {/* Benefits */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                {BENEFITS.map((b) => {
                  const Icon = b.icon;
                  return (
                    <div key={b.title} className="p-4 rounded-xl border border-border bg-card">
                      <Icon className="h-6 w-6 text-primary mb-2" />
                      <div className="font-semibold text-sm text-foreground">{b.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">{b.description}</div>
                    </div>
                  );
                })}
              </div>

              {/* CTA */}
              <div className="text-center">
                <Button size="lg" className="gap-2 px-8 text-base font-semibold" onClick={() => setStep(2)}>
                  Continuer <ArrowRight className="h-4 w-4" />
                </Button>
                <p className="mt-4 text-sm text-muted-foreground">
                  Déjà un compte ?{" "}
                  <Link to="/login" className="text-primary hover:underline font-medium">Se connecter</Link>
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <div className="max-w-md mx-auto">
                <div className="p-6 rounded-2xl border border-border bg-card/90 backdrop-blur-sm shadow-[var(--shadow-lg)]">
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-foreground">Connexion rapide</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      En tant que <span className="font-medium text-primary">{USER_TYPES.find((t) => t.key === selectedType)?.label}</span>
                    </p>
                  </div>

                  {/* OAuth - primary */}
                  <OAuthButtons />

                  <AuthDivider text="ou par téléphone" />

                  {/* Phone OTP */}
                  <PhoneOtpForm onSuccess={() => {}} />

                  {/* Trust signal */}
                  <div className="flex items-center justify-center gap-1.5 pt-4">
                    <Lock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Aucun mot de passe requis · Connexion sécurisée</span>
                  </div>

                  <div className="mt-4 text-center">
                    <button type="button" onClick={() => setStep(1)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      ← Retour au choix de profil
                    </button>
                  </div>
                </div>

                <p className="mt-6 text-center text-sm text-muted-foreground">
                  Déjà un compte ?{" "}
                  <Link to="/login" className="text-primary hover:underline font-medium">Se connecter</Link>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
