/**
 * UNPRO — PageContractorActivationSuccess
 * Activation checklist + next actions after payment.
 */
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ArrowRight, ExternalLink, Sparkles, Eye, LayoutDashboard, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import CardGlass from "@/components/unpro/CardGlass";
import { useContractorFunnel } from "@/hooks/useContractorFunnel";
import { fadeUp, staggerContainer, scaleIn } from "@/lib/motion";
import { DEFAULT_ACTIVATION_CHECKLIST } from "@/types/contractorFunnel";


export default function PageContractorActivationSuccess() {
  const { state } = useContractorFunnel();
  const navigate = useNavigate();

  // Simulate completed checklist
  const checklist = DEFAULT_ACTIVATION_CHECKLIST.map((item) => ({
    ...item,
    status: "completed" as const,
  }));

  return (
    <>
      <Helmet>
        <title>Profil activé! — {state.businessName || "UNPRO"}</title>
      </Helmet>

      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
        {/* Background celebration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-success/5 blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-lg w-full">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="space-y-6"
          >
            {/* Success header */}
            <motion.div variants={scaleIn} className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/20 mb-4"
              >
                <CheckCircle2 className="h-8 w-8 text-success" />
              </motion.div>
              <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground mb-2">
                Profil AIPP activé! 🎉
              </h1>
              <p className="text-sm text-muted-foreground">
                {state.businessName || "Votre entreprise"} est maintenant visible sur UNPRO
              </p>
            </motion.div>

            {/* Activation checklist */}
            <motion.div variants={fadeUp}>
              <CardGlass noAnimation>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Checklist d'activation
                </h3>
                <div className="space-y-2">
                  {checklist.map((item) => (
                    <div key={item.key} className="flex items-center gap-3 py-1">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span className="text-xs text-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>
              </CardGlass>
            </motion.div>

            {/* Next actions */}
            <motion.div variants={fadeUp}>
              <CardGlass noAnimation>
                <h3 className="text-sm font-semibold text-foreground mb-3">Prochaines étapes</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => navigate("/entrepreneur/profile-preview")}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <Eye className="h-4 w-4 text-primary" />
                    <span className="flex-1 text-left text-xs font-medium text-foreground">Voir mon profil public</span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => navigate("/pro")}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <LayoutDashboard className="h-4 w-4 text-primary" />
                    <span className="flex-1 text-left text-xs font-medium text-foreground">Accéder à mon dashboard</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => navigate("/entrepreneur/assets")}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <Star className="h-4 w-4 text-warning" />
                    <span className="flex-1 text-left text-xs font-medium text-foreground">Compléter les sections avancées</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              </CardGlass>
            </motion.div>

            {/* Dashboard CTA */}
            <motion.div variants={fadeUp}>
              <Button
                className="w-full h-13 rounded-xl text-base font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-[var(--shadow-glow)]"
                onClick={() => navigate("/pro")}
              >
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Aller à mon dashboard
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
