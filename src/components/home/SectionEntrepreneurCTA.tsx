/**
 * SectionEntrepreneurCTA — Banner switch for contractors.
 * Premium glass card with gradient accent.
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
          <div className="relative rounded-3xl overflow-hidden" style={{
            background: "linear-gradient(135deg, hsl(228 35% 10% / 0.9), hsl(228 30% 14% / 0.95))",
            border: "1px solid hsl(222 100% 55% / 0.15)",
          }}>
            {/* Aura */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 right-0 w-[50%] h-full" style={{
                background: "radial-gradient(ellipse at 80% 30%, hsl(222 100% 55% / 0.08), transparent 70%)",
              }} />
            </div>

            <div className="relative z-10 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20 flex items-center justify-center shrink-0">
                <HardHat className="h-7 w-7 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-display text-lg font-bold text-foreground">
                  Vous êtes entrepreneur ?
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Recevez des rendez-vous qualifiés. Activez votre profil IA.
                </p>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-warning" /> Rendez-vous garantis</span>
                  <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3 text-primary" /> ROI transparent</span>
                </div>
              </div>

              <Link
                to="/pro"
                className="h-11 rounded-xl px-5 flex items-center gap-2 text-sm font-bold cta-gradient shrink-0 active:scale-[0.97]"
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
