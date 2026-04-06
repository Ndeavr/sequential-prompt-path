/**
 * UNPRO — Universal Role Switcher
 */
import { useNavigationContext } from "@/hooks/useNavigationContext";
import { useLanguage } from "@/components/ui/LanguageToggle";
import { personaLabels } from "@/config/navigationConfig";
import type { UserRole } from "@/types/navigation";
import { Home, Briefcase, Building, Check } from "lucide-react";

const roleIcons: Record<string, React.ElementType> = {
  homeowner: Home,
  contractor: Briefcase,
  partner: Building,
};

const switchableRoles: UserRole[] = ["homeowner", "contractor", "partner"];

interface Props {
  onSwitch?: () => void;
}

export default function MenuRoleSwitcherUniversal({ onSwitch }: Props) {
  const { activeRole, setActiveRole } = useNavigationContext();
  const { lang } = useLanguage();

  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1 mb-1.5">
        {lang === "en" ? "Switch role" : "Changer de rôle"}
      </p>
      {switchableRoles.map((role) => {
        const persona = personaLabels[role];
        const Icon = roleIcons[role] || Home;
        const isActive = activeRole === role;

        return (
          <button
            key={role}
            onClick={() => {
              setActiveRole(role);
              onSwitch?.();
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors ${
              isActive
                ? "bg-primary/10 text-foreground"
                : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? "text-primary" : ""}`} />
            <span className="text-sm font-medium flex-1">
              {lang === "en" ? persona.en : persona.fr}
            </span>
            {isActive && <Check className="w-3.5 h-3.5 text-primary" />}
          </button>
        );
      })}
    </div>
  );
}
