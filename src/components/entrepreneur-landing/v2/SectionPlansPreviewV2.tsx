/**
 * SectionPlansPreviewV2 — Plan cards with primary "Pro" highlighted.
 */
import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Props {
  onTrackCta: (key: string, section: string) => void;
}

const PLANS = [
  { code: "recrue", name: "Recrue", price: 149, blurb: "Démarrer en douceur", highlight: false },
  { code: "pro", name: "Pro", price: 349, blurb: "Plus populaire", highlight: true },
  { code: "elite", name: "Élite", price: 999, blurb: "Domination locale", highlight: false },
];

export default function SectionPlansPreviewV2({ onTrackCta }: Props) {
  const navigate = useNavigate();

  return (
    <section id="section-plans" className="px-5 py-12">
      <div className="max-w-md mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-display text-2xl sm:text-3xl font-bold text-foreground text-center mb-2"
        >
          Forfaits simples et clairs
        </motion.h2>
        <p className="text-center text-sm text-muted-foreground mb-6">
          Aucun contrat long terme. Annulez quand vous voulez.
        </p>

        <div className="space-y-3">
          {PLANS.map((p, i) => (
            <motion.div
              key={p.code}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className={`relative rounded-xl border p-4 backdrop-blur-sm ${
                p.highlight
                  ? "border-primary/50 bg-gradient-to-br from-primary/10 to-accent/5 shadow-[0_8px_30px_hsl(var(--primary)/0.2)]"
                  : "border-border/50 bg-card/60"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-2.5 left-4 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-gradient-to-r from-primary to-accent text-white">
                  Recommandé
                </span>
              )}
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="font-display font-bold text-lg text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.blurb}</p>
                </div>
                <div className="text-right">
                  <span className="font-display text-2xl font-extrabold text-foreground">{p.price}$</span>
                  <span className="text-xs text-muted-foreground">/mois</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <Button
          size="lg"
          variant="outline"
          className="w-full h-12 rounded-xl mt-5 gap-2 border-primary/30 hover:bg-primary/5"
          onClick={() => { onTrackCta("plans_view_all", "plans"); navigate("/entrepreneur/plans"); }}
        >
          Voir tous les forfaits <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </section>
  );
}
