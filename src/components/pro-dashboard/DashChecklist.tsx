/**
 * Onboarding Checklist
 */
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, ListChecks } from "lucide-react";

interface Props {
  profile: any;
  reviewCount: number;
}

const items = (p: any, rc: number) => [
  { label: "Ajouter un logo", done: !!p?.logo_url, to: "/pro/profile" },
  { label: "Ajouter des photos", done: (p?.portfolio_urls?.length ?? 0) > 0, to: "/pro/documents" },
  { label: "Compléter la description", done: !!p?.description, to: "/pro/profile" },
  { label: "Définir le territoire", done: !!p?.city, to: "/pro/territories" },
  { label: "Sélectionner types de projets", done: !!p?.specialty, to: "/pro/expertise" },
  { label: "Ajouter numéro licence RBQ", done: !!p?.license_number, to: "/pro/profile" },
  { label: "Ajouter assurance", done: !!p?.insurance_info, to: "/pro/profile" },
  { label: "Ajouter site web", done: !!p?.website, to: "/pro/profile" },
];

export default function DashChecklist({ profile, reviewCount }: Props) {
  const list = items(profile, reviewCount);
  const done = list.filter(i => i.done).length;
  const pct = Math.round((done / list.length) * 100);

  if (pct === 100) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-accent" />
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">Activation du profil</span>
        </div>
        <span className="text-xs text-muted-foreground">{done}/{list.length}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted/20 overflow-hidden">
        <motion.div className="h-full rounded-full bg-gradient-to-r from-accent to-success"
          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ delay: 0.5, duration: 0.6 }} />
      </div>
      <div className="space-y-1">
        {list.map((item, i) => (
          <Link key={i} to={item.to}
            className="flex items-center gap-2.5 py-2 px-2 rounded-lg hover:bg-muted/10 transition-colors group"
          >
            {item.done ? (
              <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-muted-foreground/30 flex-shrink-0 group-hover:text-primary transition-colors" />
            )}
            <span className={`text-sm ${item.done ? "text-muted-foreground/50 line-through" : "text-foreground"}`}>
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
