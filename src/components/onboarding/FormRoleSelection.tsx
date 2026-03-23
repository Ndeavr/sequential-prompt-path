/**
 * UNPRO — Role Selection Form
 */
import { motion } from "framer-motion";
import { Home, Wrench, Building2, Users } from "lucide-react";

const ROLES = [
  {
    key: "homeowner",
    label: "Propriétaire",
    description: "Je cherche un entrepreneur ou je gère ma propriété",
    icon: Home,
  },
  {
    key: "contractor",
    label: "Entreprise de service",
    description: "Je veux recevoir des opportunités et développer mon entreprise",
    icon: Wrench,
  },
  {
    key: "manager",
    label: "Gestionnaire immobilier",
    description: "Je gère des condos ou des multilogements",
    icon: Building2,
  },
  {
    key: "partner",
    label: "Partenaire / Ambassadeur",
    description: "Je veux collaborer avec l'écosystème UNPRO",
    icon: Users,
  },
] as const;

interface FormRoleSelectionProps {
  onSelect: (role: string) => void;
  loading?: boolean;
}

export default function FormRoleSelection({ onSelect, loading }: FormRoleSelectionProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground">Quel est votre rôle ?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Cela nous permet de personnaliser votre expérience
        </p>
      </div>

      <div className="grid gap-3">
        {ROLES.map((role, i) => (
          <motion.button
            key={role.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            onClick={() => !loading && onSelect(role.key)}
            disabled={loading}
            className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-[var(--shadow-glow)] transition-all text-left group disabled:opacity-50"
          >
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <role.icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">{role.label}</p>
              <p className="text-xs text-muted-foreground">{role.description}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
