/**
 * UNPRO Design+ — Upgrade Modal
 * Shown when user hits 3 free designs/month limit
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { X, Sparkles, Zap, Palette, ImagePlus, Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props {
  currentCount: number;
  limit: number;
  onClose: () => void;
}

export default function DesignUpgradeModal({ currentCount, limit, onClose }: Props) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("design-checkout");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      toast({ title: "Erreur", description: "Impossible de créer la session de paiement.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Sparkles, label: "Designs illimités", desc: "Plus de limite de 3/mois" },
    { icon: ImagePlus, label: "Inspirations multiples", desc: "Jusqu'à 10 photos de référence" },
    { icon: Palette, label: "Palettes pro", desc: "Accès aux palettes exclusives" },
    { icon: Zap, label: "Priorité de génération", desc: "Files d'attente plus rapides" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 text-center">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 h-7 w-7"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>

          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-3">
            <Crown className="w-6 h-6 text-primary" />
          </div>

          <h3 className="font-display text-lg font-bold text-foreground">
            Passez à Design+
          </h3>

          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-xs text-muted-foreground">
            <span>{currentCount}/{limit} designs utilisés ce mois-ci</span>
          </div>
        </div>

        {/* Features */}
        <div className="px-6 pb-4 space-y-2.5">
          {features.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3 p-2.5 rounded-xl bg-muted/30">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="px-6 pb-6 space-y-3">
          <Button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full h-12 gap-2 text-base font-semibold"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Crown className="w-5 h-5" />
            )}
            {loading ? "Redirection…" : "14,99 $/mois — Commencer"}
          </Button>
          <p className="text-center text-[10px] text-muted-foreground">
            Annulable à tout moment. Facturation mensuelle en CAD.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
