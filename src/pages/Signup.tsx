/**
 * UNPRO — Signup Page (No Password)
 * Step 1: Choose account type
 * Step 1b: Choose property type (homeowner/property_manager only)
 * Step 2: OAuth / Phone OTP (no password)
 */
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Home, Building, Wrench, Briefcase, Handshake, Gift, ArrowRight, ArrowLeft, Lock } from "lucide-react";
import OAuthButtons from "@/components/auth/OAuthButtons";
import AuthDivider from "@/components/auth/AuthDivider";
import PhoneOtpForm from "@/components/auth/PhoneOtpForm";
import { consumeAuthIntent, getDefaultRedirectForRole } from "@/services/auth/authIntentService";
import logo from "@/assets/unpro-robot.png";

const ACCOUNT_TYPES = [
  { value: "homeowner", label: "Propriétaire", description: "Gérer ma propriété et mes projets", icon: Home, roleForDb: "homeowner" },
  { value: "property_manager", label: "Gestionnaire immobilier", description: "Administrer des copropriétés ou immeubles", icon: Building, roleForDb: "homeowner" },
  { value: "contractor", label: "Entrepreneur", description: "Développer mon entreprise et recevoir des rendez-vous exclusifs", icon: Wrench, roleForDb: "contractor" },
  { value: "professional", label: "Professionnel", description: "Offrir des services spécialisés aux propriétaires", icon: Briefcase, roleForDb: "contractor" },
  { value: "partner", label: "Partenaire", description: "Municipalités, médias, organismes et collaborateurs", icon: Handshake, roleForDb: "homeowner" },
  { value: "ambassador", label: "Ambassadeur", description: "Recommander UNPRO et gagner des récompenses", icon: Gift, roleForDb: "homeowner" },
] as const;

const PROPERTY_TYPES = [
  { value: "unifamiliale", label: "Unifamiliale", icon: Home },
  { value: "condo", label: "Condo / copropriété", icon: Building },
  { value: "multilogement", label: "Multilogement", icon: Building },
] as const;

const NEEDS_PROPERTY_TYPE = ["homeowner", "property_manager"];

const Signup = () => {
  const [accountType, setAccountType] = useState<string>("homeowner");
  const [propertyType, setPropertyType] = useState<string>("");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const { isAuthenticated, role, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const intent = consumeAuthIntent();
      navigate(intent?.returnPath || getDefaultRedirectForRole(role), { replace: true });
    }
  }, [isAuthenticated, isLoading, role, navigate]);

  const handleContinueFromStep1 = () => {
    if (NEEDS_PROPERTY_TYPE.includes(accountType)) {
      setStep(2);
    } else {
      setStep(3);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "linear-gradient(180deg, #F7FBFF 0%, #EAF4FF 58%, #DCEEFF 100%)" }}>
        <p style={{ color: "#6C7A92" }}>Chargement…</p>
      </div>
    );
  }

  const stepTitle = step === 1 ? "Créez votre compte" : step === 2 ? "Type de propriété" : "Connexion rapide";
  const stepDesc = step === 1
    ? "Choisissez votre profil"
    : step === 2
      ? "Quel type de propriété possédez-vous ?"
      : `En tant que ${ACCOUNT_TYPES.find((t) => t.value === accountType)?.label}`;

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-8 relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, #F7FBFF 0%, #EAF4FF 58%, #DCEEFF 100%)" }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 left-[-80px] h-56 w-56 rounded-full blur-3xl" style={{ background: "hsl(210 60% 92% / 0.6)" }} />
        <div className="absolute top-36 right-[-60px] h-52 w-52 rounded-full blur-3xl" style={{ background: "hsl(222 100% 61% / 0.1)" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-lg"
      >
        <Card className="border-0" style={{ background: "rgba(255,255,255,0.92)", border: "1px solid #DFE9F5", boxShadow: "0 8px 32px -6px hsl(220 40% 30% / 0.1)" }}>
          <CardHeader className="text-center pt-8 pb-2 space-y-1">
            <div className="flex justify-center mb-2">
              <img src={logo} alt="UNPRO" className="h-14 w-14 object-contain" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#0B1533" }}>
              {stepTitle}
            </h1>
            <p className="text-sm" style={{ color: "#6C7A92" }}>
              {stepDesc}
            </p>
          </CardHeader>

          <CardContent className="pt-2 pb-8">
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-5">
                  <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {ACCOUNT_TYPES.map((type) => {
                      const isSelected = accountType === type.value;
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setAccountType(type.value)}
                          className="relative flex flex-col items-start gap-1 rounded-xl p-3.5 text-left transition-all duration-200 cursor-pointer"
                          style={{
                            background: isSelected ? "hsl(218 100% 97%)" : "white",
                            border: isSelected ? "2px solid #3F7BFF" : "1.5px solid #DFE9F5",
                            boxShadow: isSelected
                              ? "0 0 0 3px hsl(218 100% 61% / 0.12), 0 2px 8px -2px hsl(220 40% 30% / 0.08)"
                              : "0 1px 4px -1px hsl(220 40% 30% / 0.06)",
                          }}
                        >
                          {isSelected && (
                            <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full" style={{ background: "#3F7BFF" }}>
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 shrink-0" style={{ color: isSelected ? "#3F7BFF" : "#6C7A92" }} />
                            <span className="text-sm font-semibold" style={{ color: isSelected ? "#2563EB" : "#0B1533" }}>{type.label}</span>
                          </div>
                          <span className="text-xs leading-snug" style={{ color: "#6C7A92" }}>{type.description}</span>
                        </button>
                      );
                    })}
                  </div>

                  <Button
                    className="w-full h-11 text-sm font-bold rounded-xl gap-2"
                    style={{ background: "linear-gradient(135deg, #2563EB, #3B82F6)", color: "white" }}
                    onClick={handleContinueFromStep1}
                  >
                    Continuer <ArrowRight className="h-4 w-4" />
                  </Button>

                  <p className="text-sm text-center" style={{ color: "#6C7A92" }}>
                    Déjà un compte ?{" "}
                    <Link to="/login" className="font-medium hover:underline" style={{ color: "#3F7BFF" }}>Se connecter</Link>
                  </p>
                </motion.div>
              ) : step === 2 ? (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                  <div className="grid gap-3">
                    {PROPERTY_TYPES.map((type) => {
                      const isSelected = propertyType === type.value;
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setPropertyType(type.value)}
                          className="relative flex items-center gap-3 rounded-xl p-4 text-left transition-all duration-200 cursor-pointer"
                          style={{
                            background: isSelected ? "hsl(218 100% 97%)" : "white",
                            border: isSelected ? "2px solid #3F7BFF" : "1.5px solid #DFE9F5",
                            boxShadow: isSelected
                              ? "0 0 0 3px hsl(218 100% 61% / 0.12), 0 2px 8px -2px hsl(220 40% 30% / 0.08)"
                              : "0 1px 4px -1px hsl(220 40% 30% / 0.06)",
                          }}
                        >
                          {isSelected && (
                            <div className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full" style={{ background: "#3F7BFF" }}>
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                          <Icon className="h-5 w-5 shrink-0" style={{ color: isSelected ? "#3F7BFF" : "#6C7A92" }} />
                          <span className="text-sm font-semibold" style={{ color: isSelected ? "#2563EB" : "#0B1533" }}>{type.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <Button
                    className="w-full h-11 text-sm font-bold rounded-xl gap-2"
                    style={{ background: "linear-gradient(135deg, #2563EB, #3B82F6)", color: "white" }}
                    onClick={() => setStep(3)}
                    disabled={!propertyType}
                  >
                    Continuer <ArrowRight className="h-4 w-4" />
                  </Button>

                  <div className="text-center">
                    <button type="button" onClick={() => setStep(1)} className="text-sm hover:underline flex items-center gap-1 mx-auto" style={{ color: "#3F7BFF" }}>
                      <ArrowLeft className="h-3 w-3" /> Retour
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-1">
                  <OAuthButtons />

                  <AuthDivider text="ou par téléphone" />

                  <PhoneOtpForm onSuccess={() => {}} />

                  <div className="flex items-center justify-center gap-1.5 pt-3">
                    <Lock className="h-3 w-3" style={{ color: "#6C7A92" }} />
                    <span className="text-xs" style={{ color: "#6C7A92" }}>Aucun mot de passe requis</span>
                  </div>

                  <div className="pt-2 text-center">
                    <button type="button" onClick={() => setStep(NEEDS_PROPERTY_TYPE.includes(accountType) ? 2 : 1)} className="text-sm hover:underline flex items-center gap-1 mx-auto" style={{ color: "#3F7BFF" }}>
                      <ArrowLeft className="h-3 w-3" /> Retour
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Signup;
