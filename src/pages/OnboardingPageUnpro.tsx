/**
 * UNPRO — Unified Onboarding Page
 * Handles role selection, identity, property, intent, DNA for homeowner & contractor flows.
 * Auto-saves progress, resumes from last step.
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import OnboardingStepper from "@/components/onboarding/OnboardingStepper";
import FormRoleSelection from "@/components/onboarding/FormRoleSelection";
import FormIdentityCore from "@/components/onboarding/FormIdentityCore";
import FormPropertyQuickAdd from "@/components/onboarding/FormPropertyQuickAdd";
import FormHomeownerIntent from "@/components/onboarding/FormHomeownerIntent";
import FormHomeownerDNA from "@/components/onboarding/FormHomeownerDNA";
import FormContractorBusinessCore from "@/components/onboarding/FormContractorBusinessCore";
import FormContractorDNA from "@/components/onboarding/FormContractorDNA";
import AlexWelcomePanel from "@/components/onboarding/AlexWelcomePanel";
import logo from "@/assets/unpro-robot.png";

const HOMEOWNER_STEPS = ["Rôle", "Identité", "Propriété", "Besoin", "Préférences"];
const CONTRACTOR_STEPS = ["Rôle", "Identité", "Entreprise", "ADN", "Plan"];

export default function OnboardingPageUnpro() {
  const navigate = useNavigate();
  const { user, role: existingRole, isLoading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useProfile();
  const [step, setStep] = useState(0);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Determine flow based on role
  const role = selectedRole || existingRole;
  const isHomeowner = role === "homeowner" || role === "manager";
  const isContractor = role === "contractor";
  const steps = isContractor ? CONTRACTOR_STEPS : HOMEOWNER_STEPS;

  // Resume from last step
  useEffect(() => {
    if (!authLoading && !profileLoading && profile) {
      if (profile.onboarding_completed) {
        navigate(existingRole === "contractor" ? "/pro" : "/dashboard", { replace: true });
        return;
      }
      // If role exists, skip step 0
      if (existingRole) {
        setSelectedRole(existingRole);
        if (profile.first_name && profile.last_name) {
          setStep(2); // Identity done
        } else {
          setStep(1);
        }
      }
    }
  }, [authLoading, profileLoading, profile, existingRole, navigate]);

  const handleRoleSelect = useCallback(async (r: string) => {
    if (!user?.id) {
      toast.error("Veuillez vous connecter pour continuer.");
      navigate("/login", { state: { from: "/onboarding" } });
      return;
    }
    setSaving(true);
    try {
      // Insert role
      await supabase.from("user_roles").upsert(
        { user_id: user.id, role: r as any },
        { onConflict: "user_id,role" }
      );
      setSelectedRole(r);
      setStep(1);
    } catch (err: any) {
      toast.error("Erreur lors de la sélection du rôle");
    } finally {
      setSaving(false);
    }
  }, [user?.id]);

  const handleIdentitySave = useCallback(async (data: { first_name: string; last_name: string; email: string; phone: string }) => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await supabase.from("profiles").update({
        first_name: data.first_name,
        last_name: data.last_name,
        full_name: `${data.first_name} ${data.last_name}`,
        email: data.email || undefined,
        phone: data.phone || undefined,
      }).eq("user_id", user.id);
      await refetchProfile();
      setStep(2);
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }, [user?.id, refetchProfile]);

  const handlePropertySave = useCallback(async (data: { address_line_1: string; city: string; postal_code: string; property_type: string }) => {
    if (!user?.id || !profile?.id) return;
    setSaving(true);
    try {
      await (supabase.from("properties") as any).insert({
        owner_profile_id: profile.id,
        address: data.address_line_1,
        city: data.city,
        postal_code: data.postal_code,
        property_type: data.property_type,
      });
      setStep(3);
    } catch (err) {
      toast.error("Erreur lors de l'ajout de la propriété");
    } finally {
      setSaving(false);
    }
  }, [user?.id, profile?.id]);

  const handleIntentSave = useCallback(async (data: { project_intent: string; timeline: string; budget_range: string }) => {
    if (!user?.id || !profile?.id) return;
    setSaving(true);
    try {
      await (supabase.from("homeowner_profiles") as any).upsert({
        user_id: user.id,
        profile_id: profile.id,
        project_intent: data.project_intent,
        timeline: data.timeline,
        budget_range: data.budget_range,
      }, { onConflict: "user_id" });
      setStep(4);
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }, [user?.id, profile?.id]);

  const handleHomeownerDNASave = useCallback(async (data: Record<string, string>) => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await (supabase.from("homeowner_profiles") as any).update({
        adn_score: data,
      }).eq("user_id", user.id);

      // Mark onboarding complete
      await supabase.from("profiles").update({ onboarding_completed: true } as any).eq("user_id", user.id);
      
      toast.success("Bienvenue sur UNPRO !");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }, [user?.id, navigate]);

  const handleContractorBusinessSave = useCallback(async (data: Record<string, string>) => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await (supabase.from("contractors") as any).upsert({
        user_id: user.id,
        business_name: data.company_name,
        email: data.email,
        phone: data.phone,
        website: data.website,
        specialty: data.main_category,
        city: data.service_area,
      }, { onConflict: "user_id" });
      setStep(3);
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }, [user?.id]);

  const handleContractorDNASave = useCallback(async (data: Record<string, string | string[]>) => {
    if (!user?.id) return;
    setSaving(true);
    try {
      // Get contractor id
      const { data: contractor } = await (supabase.from("contractors") as any)
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (contractor) {
        await (supabase.from("contractor_dna_profiles") as any).upsert({
          contractor_id: contractor.id,
          dna_type: "onboarding",
          dna_label_fr: "Profil ADN initial",
          dna_label_en: "Initial DNA profile",
          scores: data,
          traits: data,
          generated_by: "onboarding",
        }, { onConflict: "contractor_id" });
      }

      // Mark complete
      await supabase.from("profiles").update({ onboarding_completed: true } as any).eq("user_id", user.id);
      
      toast.success("Bienvenue sur UNPRO !");
      navigate("/pro", { replace: true });
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }, [user?.id, navigate]);

  if (authLoading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground text-sm">Chargement…</div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pb-20"
      style={{ background: "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(220 40% 96%) 100%)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-center py-6">
        <img src={logo} alt="UNPRO" className="h-10 w-10 object-contain" />
      </div>

      {/* Stepper - show after role selected */}
      {step > 0 && (
        <div className="px-4 pb-6">
          <OnboardingStepper steps={steps} currentStep={step} />
        </div>
      )}

      {/* Content */}
      <div className="max-w-md mx-auto px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
          >
            {/* Step 0: Role Selection */}
            {step === 0 && (
              <FormRoleSelection onSelect={handleRoleSelect} loading={saving} />
            )}

            {/* Step 1: Identity */}
            {step === 1 && (
              <FormIdentityCore
                initialData={{
                  first_name: profile?.first_name || "",
                  last_name: profile?.last_name || "",
                  email: profile?.email || user?.email || "",
                  phone: profile?.phone || "",
                }}
                onSave={handleIdentitySave}
                loading={saving}
              />
            )}

            {/* Homeowner Flow */}
            {isHomeowner && step === 2 && (
              <FormPropertyQuickAdd onSave={handlePropertySave} loading={saving} />
            )}
            {isHomeowner && step === 3 && (
              <FormHomeownerIntent onSave={handleIntentSave} loading={saving} />
            )}
            {isHomeowner && step === 4 && (
              <FormHomeownerDNA onSave={handleHomeownerDNASave} loading={saving} />
            )}

            {/* Contractor Flow */}
            {isContractor && step === 2 && (
              <FormContractorBusinessCore onSave={handleContractorBusinessSave} loading={saving} />
            )}
            {isContractor && step === 3 && (
              <FormContractorDNA onSave={handleContractorDNASave} loading={saving} />
            )}

            {/* Partners/managers → simple completion */}
            {!isHomeowner && !isContractor && step >= 2 && (
              <div className="text-center space-y-4 py-8">
                <h2 className="text-xl font-bold text-foreground">C'est tout pour le moment !</h2>
                <p className="text-sm text-muted-foreground">
                  Votre profil sera complété sous peu. Alex vous guidera.
                </p>
                <button
                  onClick={async () => {
                    await supabase.from("profiles").update({ onboarding_completed: true } as any).eq("user_id", user?.id);
                    navigate("/dashboard", { replace: true });
                  }}
                  className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium"
                >
                  Accéder à mon espace
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Alex Panel - subtle at bottom */}
      {step > 0 && (
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-4 pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <AlexWelcomePanel
              role={role}
              step={step}
              firstName={profile?.first_name}
            />
          </div>
        </div>
      )}
    </div>
  );
}
