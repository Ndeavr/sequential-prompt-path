/**
 * CategorySelectorTree — Select primary + secondary categories.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Check, ArrowRight, Loader2 } from "lucide-react";

const CATEGORIES = [
  {
    name: "Plomberie",
    subs: ["Plomberie résidentielle", "Plomberie commerciale", "Débouchage", "Chauffe-eau", "Salle de bain"],
  },
  {
    name: "Électricité",
    subs: ["Résidentiel", "Commercial", "Panneau électrique", "Domotique", "Éclairage"],
  },
  {
    name: "Rénovation générale",
    subs: ["Cuisine", "Salle de bain", "Sous-sol", "Agrandissement", "Finition intérieure"],
  },
  {
    name: "Toiture",
    subs: ["Bardeaux", "Membrane", "Réparation", "Inspection", "Gouttières"],
  },
  {
    name: "Peinture",
    subs: ["Intérieur", "Extérieur", "Commercial", "Décoration", "Enduit"],
  },
  {
    name: "Chauffage & Climatisation",
    subs: ["Thermopompe", "Fournaise", "Climatisation", "Plancher radiant", "Ventilation"],
  },
  {
    name: "Fondation & Structure",
    subs: ["Fissures", "Imperméabilisation", "Drain français", "Soulèvement", "Inspection"],
  },
  {
    name: "Aménagement extérieur",
    subs: ["Pavé uni", "Clôture", "Terrasse", "Piscine", "Paysagement"],
  },
];

interface Props {
  categories: { primary: string; secondary: string[] };
  onChange: (c: { primary: string; secondary: string[] }) => void;
  onContinue: () => void;
  isProcessing: boolean;
}

export default function CategorySelectorTree({ categories, onChange, onContinue, isProcessing }: Props) {
  const [expandedCat, setExpandedCat] = useState<string | null>(categories.primary || null);

  const selectPrimary = (name: string) => {
    onChange({ primary: name, secondary: categories.secondary.filter((s) => CATEGORIES.find((c) => c.name === name)?.subs.includes(s)) });
    setExpandedCat(name);
  };

  const toggleSub = (sub: string) => {
    const subs = categories.secondary.includes(sub)
      ? categories.secondary.filter((s) => s !== sub)
      : [...categories.secondary, sub];
    onChange({ ...categories, secondary: subs });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-foreground">Catégorie principale</h2>
        <p className="text-xs text-muted-foreground mt-1">Sélectionnez votre domaine principal, puis vos spécialités.</p>
      </div>

      <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
        {CATEGORIES.map((cat) => (
          <div key={cat.name}>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => selectPrimary(cat.name)}
              className={`w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all ${
                categories.primary === cat.name
                  ? "bg-primary/10 border border-primary/30"
                  : "bg-card border border-border/30 hover:border-border/60"
              }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                categories.primary === cat.name ? "bg-primary border-primary" : "border-muted-foreground/30"
              }`}>
                {categories.primary === cat.name && <Check className="w-3 h-3 text-primary-foreground" />}
              </div>
              <span className="text-sm font-medium text-foreground">{cat.name}</span>
            </motion.button>

            {/* Sub-categories */}
            {expandedCat === cat.name && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="pl-8 mt-1 space-y-1"
              >
                {cat.subs.map((sub) => (
                  <button
                    key={sub}
                    onClick={() => toggleSub(sub)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs transition-all ${
                      categories.secondary.includes(sub)
                        ? "bg-secondary/10 text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                      categories.secondary.includes(sub)
                        ? "bg-secondary border-secondary"
                        : "border-muted-foreground/30"
                    }`}>
                      {categories.secondary.includes(sub) && <Check className="w-2.5 h-2.5 text-secondary-foreground" />}
                    </div>
                    {sub}
                  </button>
                ))}
              </motion.div>
            )}
          </div>
        ))}
      </div>

      {/* CTA */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        disabled={!categories.primary || isProcessing}
        onClick={onContinue}
        className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continuer <ArrowRight className="w-4 h-4" /></>}
      </motion.button>
    </div>
  );
}
