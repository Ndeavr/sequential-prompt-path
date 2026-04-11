import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CreditCard, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useBusinessCardImport, ScannerModeCode } from "@/hooks/useBusinessCardImport";
import { useAuth } from "@/hooks/useAuth";
import { useActiveRole } from "@/contexts/ActiveRoleContext";
import DropzoneBusinessCardScan from "@/components/business-card/DropzoneBusinessCardScan";
import PanelBusinessIdentityExtraction from "@/components/business-card/PanelBusinessIdentityExtraction";
import BannerImportConfidence from "@/components/business-card/BannerImportConfidence";
import CardBusinessCardImport from "@/components/business-card/CardBusinessCardImport";
import WidgetBusinessDataCoverage from "@/components/business-card/WidgetBusinessDataCoverage";

const MODE_LABELS: Record<string, string> = {
  admin_assist: "Mode admin",
  field_rep_activation: "Activation terrain",
  affiliate_referral_capture: "Capture affilié",
  contractor_self_or_team_capture: "Mon entreprise",
};

const ATTRIBUTION_MAP: Record<string, string> = {
  admin_assist: "admin_created",
  field_rep_activation: "field_rep",
  affiliate_referral_capture: "affiliate",
  contractor_self_or_team_capture: "contractor_self_profile",
};

export default function PageBusinessCardImport() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const modeCode = (searchParams.get("mode") as ScannerModeCode) || null;
  const { user, role } = useAuth();
  const { activeRole } = useActiveRole();

  const {
    phase, fields, globalConfidence, error, progress,
    uploadAndExtract, updateField, verifyField, createLeadFromExtraction, reset,
    startSession, createAttribution,
  } = useBusinessCardImport();

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);

  // Auto-start session if mode is set and user is authenticated
  useEffect(() => {
    if (modeCode && user?.id && role && !sessionStarted) {
      setSessionStarted(true);
      startSession(modeCode, role).then((sid) => {
        if (sid) {
          const attrType = ATTRIBUTION_MAP[modeCode] || "unassigned";
          createAttribution(attrType, user.id, role);
        }
      });
    }
  }, [modeCode, user, role, sessionStarted, startSession, createAttribution]);

  const handleFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    uploadAndExtract(file);
  };

  const handleClear = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    reset();
    setSessionStarted(false);
  };

  const companyName = fields.find((f) => f.field_name === "company_name")?.field_value;
  const reviewCount = fields.filter((f) => f.needs_manual_review && !f.is_verified).length;
  const isProcessing = phase === "uploading" || phase === "processing";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="p-1.5">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-sm font-bold text-foreground">Import carte d'affaires</h1>
            <p className="text-[10px] text-muted-foreground">
              {modeCode ? MODE_LABELS[modeCode] || "Scanner" : "Scannez → Extrayez → Créez le profil"}
            </p>
          </div>
          <CreditCard className="w-5 h-5 text-primary" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Mode badge */}
        {modeCode && (
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              {MODE_LABELS[modeCode]}
            </span>
          </div>
        )}

        {/* Progress bar during processing */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Progress value={progress} className="h-1.5" />
              <p className="text-xs text-center text-muted-foreground mt-2">
                {phase === "uploading" ? "Téléversement…" : "Extraction IA en cours…"}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero section */}
        {phase === "idle" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2 pt-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Importez en 30 secondes</h2>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Prenez une photo de la carte d'affaires d'un entrepreneur. L'IA extrait automatiquement toutes les informations.
            </p>
          </motion.div>
        )}

        {/* Dropzone */}
        <DropzoneBusinessCardScan
          onFileSelected={handleFile}
          isProcessing={isProcessing}
          preview={previewUrl}
          onClear={handleClear}
        />

        {/* Error */}
        {phase === "error" && error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-center"
          >
            <p className="text-sm text-destructive font-medium">Erreur</p>
            <p className="text-xs text-muted-foreground mt-1">{error}</p>
            <Button size="sm" variant="outline" onClick={handleClear} className="mt-3">
              Réessayer
            </Button>
          </motion.div>
        )}

        {/* Extraction results */}
        <AnimatePresence>
          {(phase === "extracted" || phase === "reviewing" || phase === "creating_lead" || phase === "done") && fields.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <BannerImportConfidence
                confidence={globalConfidence}
                fieldsCount={fields.length}
                reviewCount={reviewCount}
              />
              <WidgetBusinessDataCoverage fields={fields} />
              <PanelBusinessIdentityExtraction
                fields={fields}
                onUpdateField={updateField}
                onVerifyField={verifyField}
              />
              <CardBusinessCardImport
                phase={phase}
                companyName={companyName}
                fieldsCount={fields.length}
                confidence={globalConfidence}
                onStart={() => {}}
                onCreateProfile={createLeadFromExtraction}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
