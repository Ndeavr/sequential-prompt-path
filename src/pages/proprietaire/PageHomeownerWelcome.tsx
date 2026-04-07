/**
 * PageHomeownerWelcome — Post-payment landing page
 * Verifies Stripe session, creates account if needed, starts onboarding
 */
import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Helmet } from "react-helmet-async";
import {
  CheckCircle2, Loader2, ArrowRight, Home, LogIn, Mail, Lock, User,
  Sparkles, Crown, AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

type Step = "verifying" | "verified" | "create-account" | "complete" | "error";

interface PaymentInfo {
  email: string;
  planCode: string;
  planName: string;
  hasAccount: boolean;
  customerName?: string;
}

export default function PageHomeownerWelcome() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const planParam = searchParams.get("plan");
  const navigate = useNavigate();
  const { session, isLoading: authLoading } = useAuth();

  const [step, setStep] = useState<Step>("verifying");
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [error, setError] = useState("");

  // Signup form
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setStep("error");
      setError("Session de paiement invalide.");
      return;
    }
    verifyPayment();
  }, [sessionId]);

  const verifyPayment = async () => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke("verify-homeowner-payment", {
        body: { sessionId },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      if (!data?.verified) {
        setStep("error");
        setError("Le paiement n'a pas été confirmé. Veuillez réessayer.");
        return;
      }

      const info: PaymentInfo = {
        email: data.email || "",
        planCode: data.planCode || planParam || "plus",
        planName: data.planCode === "signature" ? "Signature" : "Plus",
        hasAccount: data.hasAccount,
        customerName: data.customerName,
      };

      setPaymentInfo(info);
      setEmail(info.email);
      if (info.customerName) setFullName(info.customerName);

      if (session || info.hasAccount) {
        setStep("complete");
      } else {
        setStep("create-account");
      }
    } catch (err: any) {
      setStep("error");
      setError(err.message || "Erreur de vérification");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSignupLoading(true);

    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: "homeowner",
            plan_code: paymentInfo?.planCode,
          },
          emailRedirectTo: window.location.origin,
        },
      });

      if (signupError) throw signupError;

      // Link subscription to new user
      if (data.user && sessionId) {
        await supabase.functions.invoke("verify-homeowner-payment", {
          body: { sessionId, linkUserId: data.user.id },
        });
      }

      toast.success("Compte créé! Vérifiez votre courriel pour confirmer.");
      setStep("complete");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la création du compte");
    } finally {
      setSignupLoading(false);
    }
  };

  const PlanIcon = paymentInfo?.planCode === "signature" ? Crown : Sparkles;

  return (
    <>
      <Helmet>
        <title>Bienvenue — UNPRO</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen bg-background flex items-center justify-center px-5 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <AnimatePresence mode="wait">
            {/* VERIFYING */}
            {step === "verifying" && (
              <motion.div key="verifying" className="text-center space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                <h1 className="text-xl font-bold text-foreground">Vérification du paiement…</h1>
                <p className="text-sm text-muted-foreground">Un instant, nous confirmons votre transaction.</p>
              </motion.div>
            )}

            {/* ERROR */}
            {step === "error" && (
              <motion.div key="error" className="text-center space-y-4">
                <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                  <AlertTriangle className="h-7 w-7 text-destructive" />
                </div>
                <h1 className="text-xl font-bold text-foreground">Problème détecté</h1>
                <p className="text-sm text-muted-foreground">{error}</p>
                <div className="flex flex-col gap-2">
                  <Button asChild variant="outline" className="rounded-xl">
                    <Link to="/tarifs?tab=proprietaires">Retour aux plans</Link>
                  </Button>
                  <Button asChild variant="ghost" size="sm" className="rounded-xl">
                    <Link to="/auth">
                      <LogIn className="h-4 w-4 mr-1.5" /> Se connecter
                    </Link>
                  </Button>
                </div>
              </motion.div>
            )}

            {/* CREATE ACCOUNT */}
            {step === "create-account" && paymentInfo && (
              <motion.div
                key="create-account"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Success banner */}
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-center">
                  <CheckCircle2 className="h-8 w-8 text-primary mx-auto mb-2" />
                  <h2 className="text-lg font-bold text-foreground">Paiement confirmé!</h2>
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    <PlanIcon className="h-4 w-4 text-primary" />
                    <span className="text-sm text-primary font-semibold">Plan {paymentInfo.planName} activé</span>
                  </div>
                </div>

                {/* Account creation */}
                <div className="rounded-2xl border border-border/30 bg-card/50 p-5 space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-foreground">Créez votre compte</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Pour accéder à votre espace propriétaire et commencer à utiliser votre plan.
                    </p>
                  </div>

                  <form onSubmit={handleSignup} className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-foreground mb-1 block">Nom complet</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Jean Dupont"
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground mb-1 block">Courriel</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="jean@exemple.com"
                          className="pl-9"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground mb-1 block">Mot de passe</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Minimum 6 caractères"
                          className="pl-9"
                          minLength={6}
                          required
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full rounded-xl font-bold"
                      disabled={signupLoading}
                    >
                      {signupLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <ArrowRight className="h-4 w-4 mr-2" />
                      )}
                      Créer mon compte
                    </Button>
                  </form>

                  <div className="text-center">
                    <Link
                      to="/auth"
                      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      <LogIn className="h-3.5 w-3.5" />
                      J'ai déjà un compte — Se connecter
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}

            {/* COMPLETE */}
            {step === "complete" && paymentInfo && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6 text-center"
              >
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Bienvenue chez UNPRO!</h1>
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    <PlanIcon className="h-5 w-5 text-primary" />
                    <span className="text-base text-primary font-semibold">Plan {paymentInfo.planName}</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/30 bg-card/50 p-5 text-left space-y-3">
                  <h3 className="text-sm font-bold text-foreground">Prochaines étapes</h3>
                  <ul className="space-y-2">
                    {[
                      "Vérifiez votre courriel pour confirmer votre compte",
                      "Ajoutez votre première adresse (propriété)",
                      "Configurez votre Passeport Maison",
                      "Explorez les outils de votre plan",
                    ].map((text, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold text-primary">
                          {i + 1}
                        </span>
                        <span className="text-sm text-muted-foreground">{text}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-col gap-2">
                  <Button asChild size="lg" className="rounded-xl font-bold shadow-glow">
                    <Link to={session ? "/proprietaire" : "/auth"}>
                      <Home className="h-4 w-4 mr-2" />
                      {session ? "Accéder à mon espace" : "Se connecter"}
                    </Link>
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  );
}
