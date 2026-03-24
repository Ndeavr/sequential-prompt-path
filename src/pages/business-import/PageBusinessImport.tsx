/**
 * UNPRO — Page Business Import + Profile Completion
 * Full import wizard → preview → missing fields → Alex completion → success
 * Mobile-first, zero friction, dopamine progression.
 */
import { useState, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, CheckCircle, MessageCircle, Target } from "lucide-react";
import ImportSourceConnectorGrid from "@/components/business-import/ImportSourceConnectorGrid";
import BusinessImportForm, { type ImportFormData } from "@/components/business-import/BusinessImportForm";
import ImportedProfilePreview, { type PreviewData } from "@/components/business-import/ImportedProfilePreview";
import ProfileCompletionProgressHero from "@/components/business-import/ProfileCompletionProgressHero";
import MissingDataChecklist from "@/components/business-import/MissingDataChecklist";
import AlexDataCompletionPanel from "@/components/business-import/AlexDataCompletionPanel";
import AippDeltaPreview from "@/components/business-import/AippDeltaPreview";
import { detectMissingFields, calculateDelta, type MissingField, type ProfileData } from "@/services/profileCompletionService";
import { supabase } from "@/integrations/supabase/client";

type Step = "source" | "form" | "preview" | "completion" | "success";

// Mock import simulation
function simulateImport(data: ImportFormData): PreviewData {
  return {
    business_name: data.business_name || "Mon Entreprise",
    phone: data.phone || undefined,
    website_url: data.url || undefined,
    city: data.city || undefined,
    description: data.description || undefined,
    services: data.source !== "manual" ? ["Rénovation résidentielle", "Plomberie"] : undefined,
    logo_url: undefined,
    photos: undefined,
  };
}

export default function PageBusinessImport() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialScore = parseInt(searchParams.get("score") || "0", 10);

  const [step, setStep] = useState<Step>("source");
  const [source, setSource] = useState<"google" | "website" | "manual">("manual");
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [profileData, setProfileData] = useState<ProfileData>({});
  const [completedFields, setCompletedFields] = useState<string[]>([]);
  const [activeField, setActiveField] = useState<MissingField | null>(null);
  const [showDelta, setShowDelta] = useState(false);
  const [lastDelta, setLastDelta] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const completion = useMemo(() => detectMissingFields(profileData), [profileData]);

  const handleSourceSelect = useCallback((s: "google" | "website" | "manual") => {
    setSource(s);
    setStep("form");
  }, []);

  const handleImportSubmit = useCallback(async (data: ImportFormData) => {
    setIsLoading(true);
    // Simulate import delay
    await new Promise((r) => setTimeout(r, 2000));
    const preview = simulateImport(data);
    setPreviewData(preview);

    // Build profile data from preview
    const pd: ProfileData = {
      business_name: preview.business_name,
      phone: preview.phone,
      website_url: preview.website_url,
      primary_city: preview.city,
      description_long: preview.description,
      service_count: preview.services?.length ?? 0,
      photo_count: preview.photos?.length ?? 0,
    };
    setProfileData(pd);

    // Log import job
    try {
      await supabase.from("business_import_jobs" as never).insert({
        source_type: data.source,
        status: "completed",
        source_url: data.url || null,
        raw_payload_json: data,
        normalized_payload_json: preview,
      } as never);
    } catch { /* silent */ }

    setIsLoading(false);
    setStep("preview");
  }, []);

  const handleFieldCompleted = useCallback((field: string, value: string | File) => {
    setIsProcessing(true);
    const prevScore = completion.aippEstimate;

    setTimeout(() => {
      // Update profile data
      setProfileData((prev) => {
        const updated = { ...prev };
        if (field === "photos") {
          updated.photo_count = (updated.photo_count ?? 0) + 1;
        } else if (field === "services") {
          updated.service_count = (updated.service_count ?? 0) + 1;
        } else if (field === "locations") {
          updated.location_count = (updated.location_count ?? 0) + 1;
        } else if (typeof value === "string") {
          (updated as Record<string, unknown>)[field] = value;
        } else {
          // File upload - set as URL placeholder
          (updated as Record<string, unknown>)[field] = "uploaded";
        }
        return updated;
      });

      setCompletedFields((prev) => [...prev, field]);
      setActiveField(null);
      setIsProcessing(false);

      // Show delta
      const newCompletion = detectMissingFields({ ...profileData, [field]: typeof value === "string" ? value : "uploaded" });
      const { delta } = calculateDelta(prevScore, newCompletion.aippEstimate);
      if (delta > 0) {
        setLastDelta(delta);
        setShowDelta(true);
        setTimeout(() => setShowDelta(false), 2500);
      }

      // Log event
      supabase.from("profile_completion_events" as never).insert({
        action_type: `field_completed:${field}`,
        impact_score: delta,
        metadata_json: { field, type: typeof value === "string" ? "text" : "file" },
      } as never).then(() => {});
    }, 800);
  }, [completion.aippEstimate, profileData]);

  const isComplete = completion.percentage >= 70;

  return (
    <>
      <Helmet>
        <title>Créer mon profil d'entreprise | UNPRO</title>
        <meta name="description" content="Importez votre entreprise en quelques secondes et complétez votre profil avec Alex pour recevoir des rendez-vous qualifiés." />
      </Helmet>

      <AippDeltaPreview delta={lastDelta} visible={showDelta} />

      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
          <div className="max-w-lg mx-auto px-5 py-3 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => {
                if (step === "form") setStep("source");
                else if (step === "preview") setStep("form");
                else if (step === "completion") setStep("preview");
                else navigate(-1);
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Retour
            </Button>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Profil</p>
              <p className="text-sm font-bold text-foreground">{completion.percentage}%</p>
            </div>
            <div className="w-16" /> {/* spacer */}
          </div>
          {/* Progress bar */}
          <div className="h-1 bg-muted">
            <motion.div
              className="h-full bg-primary"
              animate={{ width: `${completion.percentage}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        <div className="max-w-lg mx-auto px-5 py-6">
          <AnimatePresence mode="wait">
            {/* ─── STEP: SOURCE ─── */}
            {step === "source" && (
              <motion.div key="source" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="text-center">
                  <h1 className="text-2xl font-black text-foreground mb-2">Créez votre profil</h1>
                  <p className="text-sm text-muted-foreground">
                    Importez vos infos automatiquement ou entrez-les manuellement. 2 minutes max.
                  </p>
                </div>
                {initialScore > 0 && (
                  <ProfileCompletionProgressHero
                    percentage={0}
                    aippScore={initialScore}
                    message="Commençons par importer vos informations."
                  />
                )}
                <ImportSourceConnectorGrid onSelectSource={handleSourceSelect} />
              </motion.div>
            )}

            {/* ─── STEP: FORM ─── */}
            {step === "form" && (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <BusinessImportForm
                  source={source}
                  onSubmit={handleImportSubmit}
                  onBack={() => setStep("source")}
                  isLoading={isLoading}
                />
              </motion.div>
            )}

            {/* ─── STEP: PREVIEW ─── */}
            {step === "preview" && previewData && (
              <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="text-center">
                  <h2 className="text-lg font-bold text-foreground mb-1">Voici ce qu'on a trouvé</h2>
                  <p className="text-sm text-muted-foreground">Vérifiez les infos et continuez.</p>
                </div>
                <ImportedProfilePreview
                  data={previewData}
                  source={source}
                  onContinue={() => setStep("completion")}
                  onEdit={() => setStep("form")}
                />
              </motion.div>
            )}

            {/* ─── STEP: COMPLETION ─── */}
            {step === "completion" && (
              <motion.div key="completion" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                <ProfileCompletionProgressHero
                  percentage={completion.percentage}
                  aippScore={completion.aippEstimate}
                  message={
                    isComplete
                      ? "Excellent! Votre profil est prêt."
                      : `Encore ${completion.missingFields.filter((f) => f.priority === "critical").length} éléments critiques à ajouter.`
                  }
                />

                {/* Alex panel */}
                <AlexDataCompletionPanel
                  currentField={activeField}
                  onFieldCompleted={handleFieldCompleted}
                  isProcessing={isProcessing}
                />

                {/* Missing data checklist */}
                {completion.missingFields.length > 0 && (
                  <MissingDataChecklist
                    fields={completion.missingFields}
                    onFieldAction={(f) => setActiveField(f)}
                    completedFields={completedFields}
                  />
                )}

                {/* Success / Continue CTA */}
                {isComplete && (
                  <motion.div
                    className="space-y-3 pt-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="bg-success/10 rounded-xl p-4 text-center">
                      <CheckCircle className="h-8 w-8 text-success mx-auto mb-2" />
                      <h3 className="font-bold text-foreground mb-1">Profil prêt!</h3>
                      <p className="text-sm text-muted-foreground">
                        Votre profil est suffisamment complet pour commencer à recevoir des opportunités.
                      </p>
                    </div>
                    <Button size="lg" className="w-full h-12 font-bold" onClick={() => navigate("/alex")}>
                      <MessageCircle className="mr-2 h-4 w-4" /> Discuter avec Alex
                    </Button>
                    <Button size="lg" variant="outline" className="w-full h-12" onClick={() => navigate("/pro/objectives")}>
                      <Target className="mr-2 h-4 w-4" /> Définir mes objectifs
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
