/**
 * UNPRO — Signup Page (Simplified: 4 roles)
 * Step 1: Choose role (4 cards)
 * Step 1b: Choose property type (owner/property_manager only)
 * Step 2: OAuth / Phone OTP
 */
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Home, Building, ArrowRight, ArrowLeft, Lock } from "lucide-react";
import OAuthButtons from "@/components/auth/OAuthButtons";
import AuthDivider from "@/components/auth/AuthDivider";
import PhoneOtpForm from "@/components/auth/PhoneOtpForm";
import { consumeAuthIntent, getDefaultRedirectForRole } from "@/services/auth/authIntentService";
import RoleCardSelector from "@/components/menu/RoleCardSelector";
import { ROLE_CARDS } from "@/data/menuTaxonomy";
import UnproIcon from "@/components/brand/UnproIcon";

const PROPERTY_TYPES = [
  { value: "unifamiliale", label: "Unifamiliale", icon: Home },
  { value: "condo", label: "Condo / copropriété", icon: Building },
  { value: "multilogement", label: "Multilogement", icon: Building },
] as const;

const NEEDS_PROPERTY_TYPE = ["owner", "property_manager"];

const Signup = () => {
  const [selectedRole, setSelectedRole] = useState("owner");
  const [propertyType, setPropertyType] = useState("");
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
    if (NEEDS_PROPERTY_TYPE.includes(selectedRole)) {
      setStep(2);
    } else {
      setStep(3);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  const roleLabel = ROLE_CARDS.find(r => r.value === selectedRole)?.label ?? "";
  const stepTitle = step === 1 ? "Créez votre compte" : step === 2 ? "Type de propriété" : "Connexion rapide";
  const stepDesc = step === 1 ? "Choisissez votre profil" : step === 2 ? "Quel type de propriété ?" : `En tant que ${roleLabel}`;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8 relative overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 left-[-80px] h-56 w-56 rounded-full blur-3xl opacity-30" style={{ background: "hsl(var(--primary))" }} />
        <div className="absolute top-36 right-[-60px] h-52 w-52 rounded-full blur-3xl opacity-10" style={{ background: "hsl(var(--secondary))" }} />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative z-10 w-full max-w-lg">
        <Card className="border border-border bg-card/95 backdrop-blur-sm shadow-xl">
          <CardHeader className="text-center pt-8 pb-2 space-y-1">
            <div className="flex justify-center mb-2">
              <UnproIcon size={56} variant="primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{stepTitle}</h1>
            <p className="text-sm text-muted-foreground">{stepDesc}</p>
          </CardHeader>

          <CardContent className="pt-2 pb-8">
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-5">
                  <RoleCardSelector selected={selectedRole} onSelect={setSelectedRole} />
                  <Button className="w-full h-11 text-sm font-bold rounded-xl gap-2" onClick={handleContinueFromStep1}>
                    Continuer <ArrowRight className="h-4 w-4" />
                  </Button>
                  <p className="text-sm text-center text-muted-foreground">
                    Déjà un compte ?{" "}
                    <Link to="/login" className="font-medium text-primary hover:underline">Se connecter</Link>
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
                          className={`relative flex items-center gap-3 rounded-xl p-4 text-left transition-all border-2 ${
                            isSelected ? "border-primary bg-primary/5 shadow-md" : "border-border bg-card hover:border-primary/30"
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                              <Check className="h-3 w-3 text-primary-foreground" />
                            </div>
                          )}
                          <Icon className={`h-5 w-5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                          <span className={`text-sm font-semibold ${isSelected ? "text-primary" : "text-foreground"}`}>{type.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <Button className="w-full h-11 text-sm font-bold rounded-xl gap-2" onClick={() => setStep(3)} disabled={!propertyType}>
                    Continuer <ArrowRight className="h-4 w-4" />
                  </Button>
                  <div className="text-center">
                    <button type="button" onClick={() => setStep(1)} className="text-sm text-primary hover:underline flex items-center gap-1 mx-auto">
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
                    <Lock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Aucun mot de passe requis</span>
                  </div>
                  <div className="pt-2 text-center">
                    <button type="button" onClick={() => setStep(NEEDS_PROPERTY_TYPE.includes(selectedRole) ? 2 : 1)} className="text-sm text-primary hover:underline flex items-center gap-1 mx-auto">
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
