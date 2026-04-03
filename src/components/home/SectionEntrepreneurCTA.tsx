/**
 * SectionEntrepreneurCTA — Dark sharp glass banner.
 */
import { motion } from "framer-motion";
import { HardHat, ArrowRight, Zap, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";

export default function SectionEntrepreneurCTA() {
  return (
    <section className="px-5 py-10">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="glass-card-elevated rounded-2xl overflow-hidden light-ray-fx">
            <div className="relative z-10 p-5 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                <HardHat className="h-6 w-6 text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-display text-base sm:text-lg font-bold text-foreground">
                  Vous êtes entrepreneur ?
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Recevez des rendez-vous qualifiés. Activez votre profil IA.
                </p>
                <div className="flex items-center gap-4 mt-2.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-warning" /> Rendez-vous garantis</span>
                  <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3 text-primary" /> ROI transparent</span>
                </div>
              </div>

              <Link
                to="/pro"
                className="h-10 rounded-xl px-5 flex items-center gap-2 text-sm font-bold btn-liquid-metal shrink-0"
              >
                Activer mon profil <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
