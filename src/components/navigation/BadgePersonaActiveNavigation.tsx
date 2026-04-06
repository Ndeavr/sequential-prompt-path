/**
 * UNPRO — Badge showing active persona
 */
import { useNavigationContext } from "@/hooks/useNavigationContext";
import { useLanguage } from "@/components/ui/LanguageToggle";
import { personaLabels } from "@/config/navigationConfig";
import type { UserRole } from "@/types/navigation";
import { Home, Briefcase, Building, Shield } from "lucide-react";

const roleIcons: Record<string, React.ElementType> = {
  homeowner: Home,
  contractor: Briefcase,
  partner: Building,
  admin: Shield,
  guest: Home,
};

export default function BadgePersonaActiveNavigation() {
  const { activeRole } = useNavigationContext();
  const { lang } = useLanguage();
  const persona = personaLabels[activeRole as UserRole | "guest"] || personaLabels.guest;
  const Icon = roleIcons[activeRole] || Home;

  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-primary/5 border border-primary/10">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">
          {lang === "en" ? persona.en : persona.fr}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {lang === "en" ? persona.descriptionEn : persona.description}
        </p>
      </div>
    </div>
  );
}
