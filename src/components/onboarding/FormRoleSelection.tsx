/**
 * UNPRO — Role Selection Form
 */
import { useState } from "react";
import { Home, Wrench, Building2, Users, Loader2 } from "lucide-react";

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
  const [picked, setPicked] = useState<string | null>(null);

  const handleClick = (key: string) => {
    if (loading || picked) return;
    setPicked(key);
    try { sessionStorage.setItem("unpro:pendingRole", key); } catch {}
    // Defer to next tick so the visual state paints before navigation/awaits
    setTimeout(() => onSelect(key), 0);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground">Quel est votre rôle ?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Cela nous permet de personnaliser votre expérience
        </p>
      </div>

      <div className="grid gap-3">
        {ROLES.map((role) => {
          const isPicked = picked === role.key;
          return (
            <button
              key={role.key}
              type="button"
              onClick={() => handleClick(role.key)}
              disabled={loading || !!picked}
              aria-busy={isPicked}
              className={`flex items-center gap-4 p-4 rounded-xl border bg-card transition-all text-left group disabled:cursor-not-allowed ${
                isPicked
                  ? "border-primary shadow-[var(--shadow-glow)] ring-2 ring-primary/30"
                  : "border-border hover:border-primary/40 hover:shadow-[var(--shadow-glow)]"
              } ${picked && !isPicked ? "opacity-40" : ""}`}
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                {isPicked ? (
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                ) : (
                  <role.icon className="h-5 w-5 text-primary" />
                )}
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">{role.label}</p>
                <p className="text-xs text-muted-foreground">{role.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="text-center pt-2">
        <a
          href="/"
          className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
        >
          ← Retour à l'accueil
        </a>
      </div>
    </div>
  );
}
