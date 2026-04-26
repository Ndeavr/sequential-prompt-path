/**
 * SectionScarcityV2 — Limited spots per territory, founder scarcity.
 */
import { motion } from "framer-motion";
import { MapPin, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onTrackCta: (key: string, section: string) => void;
}

const TERRITORIES = [
  { city: "Laval", left: 2 },
  { city: "Montréal", left: 5 },
  { city: "Rive-Nord", left: 3 },
];

export default function SectionScarcityV2({ onTrackCta }: Props) {
  return (
    <section className="px-5 py-12">
      <div className="max-w-md mx-auto">
        <div className="rounded-2xl border border-warning/30 bg-gradient-to-br from-warning/10 to-card/30 backdrop-blur-md p-5">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="w-4 h-4 text-warning" />
            <span className="text-[11px] uppercase tracking-wider font-bold text-warning">Accès limité</span>
          </div>

          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-xl sm:text-2xl font-bold text-foreground"
          >
            Places limitées par territoire
          </motion.h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Nous limitons le nombre d'entrepreneurs par secteur pour protéger la qualité des opportunités.
          </p>

          <div className="mt-4 space-y-2">
            {TERRITORIES.map((t, i) => (
              <motion.div
                key={t.city}
                initial={{ opacity: 0, x: -6 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-background/40 border border-border/40"
              >
                <span className="flex items-center gap-2 text-sm text-foreground">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  {t.city}
                </span>
                <span className="text-xs font-bold text-warning">
                  {t.left} place{t.left > 1 ? "s" : ""} restante{t.left > 1 ? "s" : ""}
                </span>
              </motion.div>
            ))}
          </div>

          <Button
            size="lg"
            className="w-full h-12 rounded-xl mt-5 font-bold"
            onClick={() => { onTrackCta("scarcity_reserve", "scarcity"); document.getElementById("section-form")?.scrollIntoView({ behavior: "smooth" }); }}
          >
            Réserver ma place
          </Button>
        </div>
      </div>
    </section>
  );
}
