import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function SectionManifestoCTA() {
  return (
    <section className="px-5 py-10 md:py-14">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Link
            to="/manifeste"
            className="group block glass-card-elevated rounded-3xl p-6 sm:p-8 light-ray-fx transition-all duration-300 hover:border-primary/30"
          >
            <div className="relative z-10 space-y-3">
              <p className="text-xs uppercase tracking-[0.25em] text-primary font-medium">
                Manifeste
              </p>
              <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground leading-tight">
                Le monde des services est brisé.
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-lg">
                On vous a appris à demander 3 soumissions. UNPRO existe pour mettre fin à ça. Pas pour ajouter une couche de plus.
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:gap-2.5 transition-all">
                Lire le manifeste <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
