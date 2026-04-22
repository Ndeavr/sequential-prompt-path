/**
 * Screen 1 — Landing / Promise
 * "Obtenez votre score AIPP et activez votre profil UNPRO"
 */
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Bot, Zap, Shield, TrendingUp, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import UnproLogo from "@/components/brand/UnproLogo";

const VALUE_PILLS = [
  { icon: Clock, label: "2 min pour voir votre score" },
  { icon: Zap, label: "Import automatique de vos données" },
  { icon: Shield, label: "Vérification RBQ intégrée" },
  { icon: TrendingUp, label: "Visibilité IA immédiate" },
];

export default function ScreenLanding() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <UnproLogo size={120} variant="primary" animated={false} />
      </div>

      {/* Hero */}
      <motion.div
        className="flex-1 flex flex-col justify-center px-4 pb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight mb-3">
          Obtenez votre score AIPP et activez votre profil{" "}
          <span className="text-primary">UNPRO</span>
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg mb-8 max-w-lg">
          Importation automatique de vos données, logo, avis, zones de service et visibilité web. La plupart des champs remplis pour vous.
        </p>

        {/* Value pills */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {VALUE_PILLS.map((pill) => (
            <div
              key={pill.label}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm"
            >
              <pill.icon className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs font-medium text-foreground/80">{pill.label}</span>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3">
          <Button
            size="lg"
            className="w-full text-base font-semibold h-14 rounded-xl"
            onClick={() => navigate("/entrepreneur/activer/compte")}
          >
            Créer mon profil maintenant
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full text-base h-14 rounded-xl border-primary/30 hover:bg-primary/5"
            onClick={() => navigate("/entrepreneur/activer/compte?mode=alex")}
          >
            <Bot className="w-5 h-5 mr-2 text-primary" />
            Le faire avec Alex
          </Button>
        </div>

        {/* Social proof */}
        <motion.div
          className="mt-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <p className="text-xs text-muted-foreground">
            Plus de <span className="font-semibold text-foreground">200 entrepreneurs</span> activés au Québec
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
