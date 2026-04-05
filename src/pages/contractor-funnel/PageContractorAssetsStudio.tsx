/**
 * UNPRO — PageContractorAssetsStudio
 * Logo, portfolio, certificates upload zones.
 */
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Upload, Image, Shield, Camera, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import FunnelLayout from "@/components/contractor-funnel/FunnelLayout";
import CardGlass from "@/components/unpro/CardGlass";
import { useContractorFunnel } from "@/hooks/useContractorFunnel";
import { fadeUp, staggerContainer } from "@/lib/motion";

interface UploadZoneProps {
  icon: typeof Upload;
  title: string;
  description: string;
  accept?: string;
  multiple?: boolean;
  files: File[];
  onFilesChange: (files: File[]) => void;
}

function UploadZone({ icon: Icon, title, description, accept, multiple, files, onFilesChange }: UploadZoneProps) {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    onFilesChange(multiple ? [...files, ...dropped] : dropped.slice(0, 1));
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    onFilesChange(multiple ? [...files, ...selected] : selected.slice(0, 1));
  };

  return (
    <CardGlass noAnimation>
      <div className="flex items-start gap-3 mb-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>

      <label
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border/50 rounded-xl cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-colors"
      >
        <Upload className="h-6 w-6 text-muted-foreground mb-2" />
        <span className="text-xs text-muted-foreground text-center">
          Glisser-déposer ou <span className="text-primary font-medium">parcourir</span>
        </span>
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleSelect}
          className="hidden"
        />
      </label>

      {files.length > 0 && (
        <div className="mt-3 space-y-1">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-foreground/80">
              <CheckCircle2 className="h-3 w-3 text-success" />
              <span className="truncate">{f.name}</span>
            </div>
          ))}
        </div>
      )}
    </CardGlass>
  );
}

export default function PageContractorAssetsStudio() {
  const { state, goToStep } = useContractorFunnel();
  const [logoFiles, setLogoFiles] = useState<File[]>([]);
  const [portfolioFiles, setPortfolioFiles] = useState<File[]>([]);
  const [certFiles, setCertFiles] = useState<File[]>([]);

  return (
    <>
      <Helmet>
        <title>Assets Studio — {state.businessName || "AIPP"} | UNPRO</title>
      </Helmet>

      <FunnelLayout currentStep="assets_studio">
        <div className="max-w-2xl mx-auto">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-4">
              <Camera className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground mb-2">
              Assets visuels
            </h1>
            <p className="text-sm text-muted-foreground">
              Logo, photos et documents pour un profil crédible
            </p>
          </motion.div>

          <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-4">
            <motion.div variants={fadeUp}>
              <UploadZone
                icon={Image}
                title="Logo"
                description="Format carré recommandé. PNG ou SVG avec fond transparent."
                accept="image/*"
                files={logoFiles}
                onFilesChange={setLogoFiles}
              />
            </motion.div>

            <motion.div variants={fadeUp}>
              <UploadZone
                icon={Camera}
                title="Portfolio / Photos de projets"
                description="Ajoutez vos meilleurs projets. Avant/après recommandé."
                accept="image/*"
                multiple
                files={portfolioFiles}
                onFilesChange={setPortfolioFiles}
              />
            </motion.div>

            <motion.div variants={fadeUp}>
              <UploadZone
                icon={Shield}
                title="Certifications & Documents"
                description="RBQ, assurances, certifications. PDF ou images."
                accept="image/*,.pdf"
                multiple
                files={certFiles}
                onFilesChange={setCertFiles}
              />
            </motion.div>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button variant="ghost" onClick={() => goToStep("aipp_builder")} className="text-sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Button>
              <Button
                className="flex-1 h-13 rounded-xl text-sm font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-[var(--shadow-glow)]"
                onClick={() => goToStep("faq_builder")}
              >
                Continuer vers FAQ
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </FunnelLayout>
    </>
  );
}
