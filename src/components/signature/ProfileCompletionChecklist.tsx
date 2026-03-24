/**
 * ProfileCompletionChecklist — Shows what's complete and what's missing.
 */
import { motion } from "framer-motion";
import { Check, AlertCircle, ArrowRight } from "lucide-react";

interface Props {
  draft: {
    business_name: string;
    first_name: string;
    city: string;
    phone: string;
    email: string;
    activity: string;
    website?: string;
  };
  completion: number;
  onComplete: () => void;
}

export default function ProfileCompletionChecklist({ draft, completion, onComplete }: Props) {
  const items = [
    { label: "Nom d'entreprise", done: !!draft.business_name },
    { label: "Ville", done: !!draft.city },
    { label: "Téléphone", done: !!draft.phone },
    { label: "Courriel", done: !!draft.email },
    { label: "Activité principale", done: !!draft.activity },
    { label: "Site web", done: !!draft.website },
    { label: "Données importées", done: completion >= 50 },
    { label: "Description générée", done: completion >= 60 },
  ];

  const doneCount = items.filter((i) => i.done).length;
  const pct = Math.round((doneCount / items.length) * 100);

  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <h2 className="text-lg font-bold text-foreground">Complétion du profil</h2>
        <div className="relative w-24 h-24 mx-auto">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="3"
            />
            <motion.path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ strokeDasharray: "0 100" }}
              animate={{ strokeDasharray: `${pct} 100` }}
              transition={{ duration: 1 }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold text-foreground">{pct}%</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.label}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl ${
              item.done ? "bg-green-500/5 border border-green-500/10" : "bg-muted/10 border border-border/20"
            }`}
          >
            {item.done ? (
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            )}
            <span className={`text-sm ${item.done ? "text-foreground" : "text-muted-foreground"}`}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onComplete}
        className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2"
      >
        Voir la prévisualisation <ArrowRight className="w-4 h-4" />
      </motion.button>
    </div>
  );
}
