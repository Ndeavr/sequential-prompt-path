/**
 * SectionSmartHome — "Votre maison a enfin un cerveau" with Score IA preview.
 */
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SectionSmartHome() {
  const navigate = useNavigate();

  return (
    <section className="px-5 py-14 md:py-20">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <h2 className="font-display text-[22px] sm:text-[28px] md:text-[36px] font-bold text-foreground leading-tight">
            Votre maison a enfin un <span className="text-primary">cerveau.</span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="glass-card rounded-3xl p-5 sm:p-7 space-y-5">
            {/* Tabs mockup */}
            <div className="flex rounded-xl overflow-hidden border border-border/60">
              {["Factures", "Travaux", "Dossier Maison"].map((tab, i) => (
                <button
                  key={tab}
                  className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold transition-colors ${
                    i === 0 ? "bg-primary/10 text-primary" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Factures", value: "43" },
                { label: "Documents", value: "80" },
                { label: "Score", value: "87" },
              ].map((item) => (
                <div key={item.label} className="rounded-xl p-3 bg-muted/40 border border-border/40">
                  <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                  <p className="text-lg font-bold text-foreground mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate("/score-maison")}
              className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-bold cta-gradient"
            >
              Voir mon score IA <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
