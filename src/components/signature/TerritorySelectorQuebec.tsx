/**
 * TerritorySelectorQuebec — Select service cities in Quebec.
 */
import { motion } from "framer-motion";
import { MapPin, Check, ArrowRight, Loader2 } from "lucide-react";

const CITIES = [
  "Montréal", "Laval", "Longueuil", "Québec", "Gatineau",
  "Sherbrooke", "Trois-Rivières", "Lévis", "Terrebonne", "Saint-Jean-sur-Richelieu",
  "Brossard", "Repentigny", "Saint-Jérôme", "Drummondville", "Granby",
  "Blainville", "Saint-Hyacinthe", "Châteauguay", "Mascouche", "Mirabel",
  "Rimouski", "Victoriaville", "Saguenay", "Saint-Eustache", "Varennes",
];

interface Props {
  selected: string[];
  onChange: (cities: string[]) => void;
  onContinue: () => void;
  isProcessing: boolean;
}

export default function TerritorySelectorQuebec({ selected, onChange, onContinue, isProcessing }: Props) {
  const toggle = (city: string) => {
    onChange(selected.includes(city) ? selected.filter((c) => c !== city) : [...selected, city]);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" /> Vos territoires
        </h2>
        <p className="text-xs text-muted-foreground mt-1">Sélectionnez les villes où vous offrez vos services.</p>
      </div>

      <div className="flex flex-wrap gap-2 max-h-[50vh] overflow-y-auto">
        {CITIES.map((city) => (
          <motion.button
            key={city}
            whileTap={{ scale: 0.95 }}
            onClick={() => toggle(city)}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
              selected.includes(city)
                ? "bg-primary/10 border border-primary/30 text-primary"
                : "bg-card border border-border/30 text-muted-foreground hover:border-border/60"
            }`}
          >
            {selected.includes(city) && <Check className="w-3 h-3" />}
            {city}
          </motion.button>
        ))}
      </div>

      {selected.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {selected.length} ville{selected.length > 1 ? "s" : ""} sélectionnée{selected.length > 1 ? "s" : ""}
        </p>
      )}

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        disabled={selected.length === 0 || isProcessing}
        onClick={onContinue}
        className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continuer <ArrowRight className="w-4 h-4" /></>}
      </motion.button>
    </div>
  );
}
