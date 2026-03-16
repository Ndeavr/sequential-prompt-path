/**
 * UNPRO — Smart Onboarding Page (/start)
 * Replaces cold login redirects with an intelligent onboarding experience.
 * Pre-selects user type based on the intent that triggered the redirect.
 */

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Home, Wrench, Users, Sparkles, FileCheck, Search, Shield,
  ArrowRight, CheckCircle2, Eye, ChevronRight, Mail,
} from "lucide-react";
import logo from "@/assets/unpro-robot.png";

// ── Intent → user type mapping ──
const INTENT_TYPE_MAP: Record<string, "homeowner" | "contractor" | "ambassador"> = {
  "analyse-soumissions": "homeowner",
  "passeport-maison": "homeowner",
  "score-maison": "homeowner",
  "diagnostic": "homeowner",
  "upload-soumission": "homeowner",
  "matching": "homeowner",
  "leads": "contractor",
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
  "leads": "/pro/leads",
  "profil-entreprise": "/pro/profile",
  "plans": "/pricing",
  "ambassadeur": "/ambassadeurs",
};

const USER_TYPES = [
  {
    key: "homeowner" as const,
    label: "Propriétaire",
    description: "Gérer ma propriété et mes projets",
    icon: Home,
    roleForDb: "homeowner",
    accountType: "homeowner",
  },
  {
    key: "contractor" as const,
    label: "Entrepreneur",
    description: "Développer mon entreprise et recevoir des opportunités",
    icon: Wrench,
    roleForDb: "contractor",
    accountType: "contractor",
  },
  {
    key: "ambassador" as const,
    label: "Ambassadeur",
    description: "Recommander UNPRO et gagner des récompenses",
    icon: Users,
    roleForDb: "homeowner",
    accountType: "ambassador",
  },
];

const SOCIAL_PROOF = [
  { value: "2 400+", label: "propriétaires actifs" },
  { value: "8 500+", label: "soumissions analysées" },
  { value: "340+", label: "entrepreneurs vérifiés" },
];

const BENEFITS = [
  {
    icon: FileCheck,
    title: "Analyse intelligente",
    description: "IA qui compare vos soumissions et détecte les anomalies",
  },
  {
    icon: Shield,
    title: "Entrepreneurs certifiés",
    description: "Matching avec des professionnels vérifiés par UNPRO",
  },
  {
    icon: Eye,
    title: "Passeport Maison",
    description: "Le jumeau numérique de votre propriété, toujours à jour",
  },
];

export default function StartPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signUp, signIn, isAuthenticated, user } = useAuth();

  const intent = searchParams.get("intent") || "passeport-maison";
  const redirectTo = searchParams.get("redirect") || INTENT_REDIRECT_MAP[intent] || "/dashboard";

  const inferredType = INTENT_TYPE_MAP[intent] || "homeowner";
  const [selectedType, setSelectedType] = useState<"homeowner" | "contractor" | "ambassador">(inferredType);
  const [step, setStep] = useState<1 | 2>(1);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // If already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, user, navigate, redirectTo]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      toast.error("Veuillez entrer votre prénom.");
      return;
    }
    setLoading(true);

    const typeConfig = USER_TYPES.find((t) => t.key === selectedType)!;
    const fullName = `${firstName} ${lastName}`.trim();

    const { error } = await signUp(email, password, fullName, typeConfig.roleForDb, {
      first_name: firstName,
      last_name: lastName,
      account_type: typeConfig.accountType,
    });

    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Compte créé ! Vérifiez votre courriel pour confirmer.");
      navigate("/login", { state: { from: redirectTo } });
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      {/* ── Ambient background ── */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full blur-[120px] opacity-30" style={{ background: "hsl(var(--primary))" }} />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full blur-[100px] opacity-20" style={{ background: "hsl(var(--secondary))" }} />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-4 py-12 sm:py-20">
        {/* ── SECTION 1: Hero ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <Link to="/" className="inline-block mb-6">
            <img src={logo} alt="UNPRO" className="h-16 w-16 mx-auto" />
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-display">
            Avant de continuer…
          </h1>
          <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
            UNPRO analyse votre projet, vos soumissions et votre maison pour vous éviter des erreurs coûteuses.
            <br />
            <span className="text-foreground font-medium">Créer votre compte prend moins de 30 secondes.</span>
          </p>
        </motion.div>

        {/* ── SECTION 2: Social Proof ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex justify-center gap-6 sm:gap-10 mb-12"
        >
          {SOCIAL_PROOF.map((sp) => (
            <div key={sp.label} className="text-center">
              <div className="text-2xl font-bold text-foreground font-display">{sp.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{sp.label}</div>
            </div>
          ))}
        </motion.div>

        {/* ── Step indicator ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Étape {step} sur 2</span>
            <span>{step === 1 ? "Choisir votre profil" : "Créer votre compte"}</span>
          </div>
          <Progress value={step === 1 ? 50 : 100} className="h-1.5" />
        </motion.div>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              {/* ── SECTION 3: User type ── */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                {USER_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = selectedType === type.key;
                  return (
                    <button
                      key={type.key}
                      onClick={() => setSelectedType(type.key)}
                      className={`relative p-5 rounded-xl border-2 transition-all duration-200 text-left group
                        ${isSelected
                          ? "border-primary bg-primary/5 shadow-[var(--shadow-glow)]"
                          : "border-border bg-card hover:border-primary/40 hover:bg-primary/[0.02]"
                        }`}
                    >
                      {isSelected && (
                        <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-primary" />
                      )}
                      <Icon className={`h-7 w-7 mb-3 ${isSelected ? "text-primary" : "text-muted-foreground group-hover:text-primary/70"}`} />
                      <div className="font-semibold text-foreground">{type.label}</div>
                      <div className="text-sm text-muted-foreground mt-1">{type.description}</div>
                    </button>
                  );
                })}
              </div>

              {/* ── SECTION 4: Alex micro-interaction ── */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                className="flex items-start gap-4 p-5 rounded-xl border border-border bg-card/80 backdrop-blur-sm mb-10"
              >
                <div className="relative flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <motion.div
                    className="absolute inset-0 rounded-full bg-primary/20"
                    animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
                    transition={{ duration: 2.5, repeat: Infinity }}
                  />
                </div>
                <div>
                  <div className="font-semibold text-sm text-foreground">Alex — Assistant IA UNPRO</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    « Je peux analyser vos soumissions ou vous aider à trouver le bon entrepreneur. »
                  </p>
                </div>
              </motion.div>

              {/* ── SECTION 5: Benefits ── */}
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

              {/* ── CTA to step 2 ── */}
              <div className="text-center">
                <Button
                  size="lg"
                  className="gap-2 px-8 text-base font-semibold"
                  onClick={() => setStep(2)}
                >
                  Continuer
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <p className="mt-4 text-sm text-muted-foreground">
                  Déjà un compte ?{" "}
                  <Link to="/login" className="text-primary hover:underline font-medium">
                    Se connecter
                  </Link>
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* ── SECTION 7: Signup form ── */}
              <div className="max-w-md mx-auto">
                <div className="p-6 rounded-2xl border border-border bg-card/90 backdrop-blur-sm shadow-[var(--shadow-lg)]">
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-foreground">Créer votre compte</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      En tant que <span className="font-medium text-primary">{USER_TYPES.find((t) => t.key === selectedType)?.label}</span>
                    </p>
                  </div>

                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="firstName" className="text-sm text-foreground">Prénom</Label>
                        <Input
                          id="firstName"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="Jean"
                          required
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName" className="text-sm text-foreground">Nom</Label>
                        <Input
                          id="lastName"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Tremblay"
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="email" className="text-sm text-foreground">Courriel</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="jean@exemple.com"
                        required
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="password" className="text-sm text-foreground">Mot de passe</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimum 6 caractères"
                        required
                        minLength={6}
                        className="mt-1"
                      />
                    </div>

                    <Button type="submit" className="w-full gap-2 font-semibold" size="lg" disabled={loading}>
                      {loading ? "Création en cours…" : (
                        <>
                          <Mail className="h-4 w-4" />
                          Créer mon compte
                        </>
                      )}
                    </Button>
                  </form>

                  <div className="mt-4 flex items-center gap-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground">ou</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  <div className="mt-4 text-center">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      ← Retour au choix de profil
                    </button>
                  </div>
                </div>

                <p className="mt-6 text-center text-sm text-muted-foreground">
                  Déjà un compte ?{" "}
                  <Link to="/login" className="text-primary hover:underline font-medium">
                    Se connecter
                  </Link>
                </p>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Temps estimé : <span className="font-medium text-foreground">30 secondes</span>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
