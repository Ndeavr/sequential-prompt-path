/**
 * SectionSocialProofV2 — Quote from contractor + mini stats.
 */
import { motion } from "framer-motion";
import { Star } from "lucide-react";

export default function SectionSocialProofV2() {
  return (
    <section className="px-5 py-10">
      <div className="max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-border/60 bg-gradient-to-br from-card to-card/40 backdrop-blur-md p-5"
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent shrink-0 flex items-center justify-center text-white font-bold text-lg">
              M
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex gap-0.5 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-warning text-warning" />
                ))}
              </div>
              <p className="text-sm text-foreground/95 leading-relaxed italic">
                « J'ai fermé 3 contrats le premier mois avec UNPRO. »
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                — Marc, toiture
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="rounded-xl border border-border/50 bg-card/60 p-4 text-center">
            <p className="font-display text-2xl font-extrabold text-foreground">127</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">entreprises actives</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/60 p-4 text-center">
            <p className="font-display text-2xl font-extrabold text-foreground">4.9<span className="text-muted-foreground text-sm font-normal">/5</span></p>
            <p className="text-[11px] text-muted-foreground mt-0.5">satisfaction</p>
          </div>
        </div>
      </div>
    </section>
  );
}
