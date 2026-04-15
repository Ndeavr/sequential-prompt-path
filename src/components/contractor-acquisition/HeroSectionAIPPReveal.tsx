/**
 * HeroSectionAIPPReveal — Premium hero with 6-method import grid + AIPP score reveal.
 * Mobile-first, dark premium aesthetic.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, Zap, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import ImportSourceConnectorGrid, { type ImportSource } from "@/components/business-import/ImportSourceConnectorGrid";
import BusinessImportForm, { type ImportFormData } from "@/components/business-import/BusinessImportForm";

interface Props {
  onAnalyze: (data: { businessName: string; city: string; website: string }) => void;
  loading?: boolean;
}

export default function HeroSectionAIPPReveal({ onAnalyze, loading }: Props) {
  const [selectedSource, setSelectedSource] = useState<ImportSource | null>(null);

  const handleSourceSelect = (source: ImportSource) => {
    setSelectedSource(source);
  };

  const handleImportSubmit = (data: ImportFormData) => {
    onAnalyze({
      businessName: data.business_name || "",
      city: data.city || "",
      website: data.url || "",
    });
  };

  return (
    <section className="relative overflow-hidden px-4 pt-12 pb-16 sm:pt-20 sm:pb-24">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-primary/8 blur-[120px]" />
      </div>

      <div className="relative max-w-lg mx-auto text-center space-y-6">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary"
        >
          <Zap className="w-3 h-3" />
          Analyse IA gratuite en 30 secondes
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight"
        >
          Découvrez comment{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
            l'IA vous perçoit
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-muted-foreground max-w-sm mx-auto"
        >
          {selectedSource
            ? "Remplissez les informations pour lancer l'analyse."
            : "Choisissez comment importer votre profil. Score AIPP instantané."}
        </motion.p>

        {/* Grid / Form */}
        <AnimatePresence mode="wait">
          {!selectedSource ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: 0.3 }}
              className="text-left"
            >
              <ImportSourceConnectorGrid onSelectSource={handleSourceSelect} />
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-left"
            >
              <BusinessImportForm
                source={selectedSource}
                onSubmit={handleImportSubmit}
                onBack={() => setSelectedSource(null)}
                isLoading={loading}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trust signals */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground"
        >
          <span>✓ Gratuit</span>
          <span>✓ Sans engagement</span>
          <span>✓ Résultat instantané</span>
        </motion.div>
      </div>
    </section>
  );
}
