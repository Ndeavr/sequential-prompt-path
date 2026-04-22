/**
 * Screen 4 — Preliminary AIPP Score Reveal
 * Cinematic score animation with subscores + trust signals + sticky CTA.
 */
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, AlertTriangle, Eye, Shield, Star, Image, Target, Globe, Cpu, MapPin, Lock, HeadphonesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActivationFunnel } from "@/hooks/useActivationFunnel";
import { useHesitationRescue } from "@/hooks/useHesitationRescue";
import StickyMobileCTA from "@/components/ui/StickyMobileCTA";

const SUBSCORE_CONFIG = [
  { key: "visibility", label: "Visibilité", icon: Eye, color: "text-blue-400" },
  { key: "trust", label: "Confiance / Conformité", icon: Shield, color: "text-emerald-400" },
  { key: "reviews", label: "Réputation", icon: Star, color: "text-amber-400" },
  { key: "media", label: "Contenu visuel", icon: Image, color: "text-purple-400" },
  { key: "conversion", label: "Conversion", icon: Target, color: "text-rose-400" },
  { key: "aeo", label: "Structure IA / AEO", icon: Cpu, color: "text-cyan-400" },
  { key: "service_precision", label: "Précision services", icon: Globe, color: "text-orange-400" },
  { key: "geo_precision", label: "Précision géographique", icon: MapPin, color: "text-teal-400" },
];

export default function ScreenScore() {
  const navigate = useNavigate();
  const { state } = useActivationFunnel();
  useHesitationRescue({ screenKey: "score" });

  const score = state.aipp_score || {
    overall: 47,
    subscores: SUBSCORE_CONFIG.map((s) => ({
      key: s.key,
      label: s.label,
      score: Math.floor(Math.random() * 60) + 20,
      maxScore: 100,
    })),
    found_items: [
      "Nom d'entreprise détecté",
      "Numéro de téléphone trouvé",
      "Site web analysé",
      "Profil Google détecté",
      "3 avis clients trouvés",
    ],
    missing_items: [
      "Logo haute résolution manquant",
      "Licence RBQ non vérifiée",
      "Photos avant/après absentes",
      "Zones de service non confirmées",
      "Calendrier non connecté",
    ],
  };

  const handleContinue = () => navigate("/entrepreneur/activer/profil");

  return (
    <div className="min-h-screen bg-background px-4 py-6 pb-28 sm:pb-6">
      {/* Score reveal */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="text-sm text-muted-foreground mb-2">Votre score AIPP préliminaire</p>
        <motion.div
          className="text-7xl font-bold text-foreground inline-block"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          {score.overall}
          <span className="text-2xl text-muted-foreground font-normal">/100</span>
        </motion.div>
        <p className="text-sm text-muted-foreground mt-2">
          {score.overall < 50 ? "Beaucoup de potentiel à débloquer" :
           score.overall < 70 ? "Bon début, quelques optimisations clés" :
           "Excellent profil!"}
        </p>
      </motion.div>

      {/* Subscores grid */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        {SUBSCORE_CONFIG.map((config, i) => {
          const sub = score.subscores.find((s: any) => s.key === config.key) || { score: 0, maxScore: 100 };
          return (
            <motion.div
              key={config.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="rounded-xl border border-border/50 bg-card/50 p-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <config.icon className={`w-4 h-4 ${config.color}`} />
                <span className="text-xs text-muted-foreground">{config.label}</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-xl font-bold text-foreground">{(sub as any).score}</span>
                <span className="text-xs text-muted-foreground mb-0.5">/{(sub as any).maxScore}</span>
              </div>
              <div className="h-1 rounded-full bg-muted mt-2 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${(sub as any).score}%` }}
                  transition={{ delay: 0.8 + i * 0.1, duration: 0.5 }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Found items */}
      <motion.div className="mb-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}>
        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-500" />
          Trouvé automatiquement
        </h3>
        <div className="space-y-1.5">
          {score.found_items.map((item: string, i: number) => (
            <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
              <Check className="w-3 h-3 text-emerald-500 shrink-0" />
              {item}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Missing items */}
      <motion.div className="mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}>
        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          À compléter pour améliorer votre score
        </h3>
        <div className="space-y-1.5">
          {score.missing_items.map((item: string, i: number) => (
            <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
              {item}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Trust reinforcement */}
      <motion.div
        className="flex items-center justify-center gap-4 mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
      >
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Lock className="w-3 h-3" /> Données sécurisées
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Shield className="w-3 h-3" /> Annulez en tout temps
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <HeadphonesIcon className="w-3 h-3" /> Support disponible
        </div>
      </motion.div>

      {/* Desktop CTA */}
      <Button
        size="lg"
        className="w-full h-14 text-base font-semibold rounded-xl hidden sm:flex"
        onClick={handleContinue}
      >
        Compléter mon profil
        <ArrowRight className="w-5 h-5 ml-2" />
      </Button>

      {/* Mobile sticky CTA */}
      <StickyMobileCTA
        label="Compléter mon profil"
        onClick={handleContinue}
        icon={<ArrowRight className="w-5 h-5 mr-2" />}
      />
    </div>
  );
}
