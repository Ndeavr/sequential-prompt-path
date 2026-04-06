/**
 * UNPRO — Contextual Quick Actions (desktop zone 3 + drawer)
 */
import { Link } from "react-router-dom";
import { useNavigationContext } from "@/hooks/useNavigationContext";
import { useLanguage } from "@/components/ui/LanguageToggle";
import { quickActionsByRole } from "@/config/navigationConfig";
import { resolveIcon } from "./IconResolver";
import type { UserRole } from "@/types/navigation";

interface Props {
  onClose?: () => void;
  variant?: "header" | "drawer";
}

export default function MenuQuickActionsContextual({ onClose, variant = "header" }: Props) {
  const { activeRole } = useNavigationContext();
  const { lang } = useLanguage();
  const actions = quickActionsByRole[activeRole as UserRole | "guest"] || [];

  if (actions.length === 0) return null;

  if (variant === "header") {
    return (
      <div className="hidden lg:flex items-center gap-1">
        {actions.map((item) => {
          const Icon = resolveIcon(item.icon);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg transition-all duration-200 text-primary/80 hover:text-primary hover:bg-primary/5 border border-primary/10 hover:border-primary/20"
            >
              <Icon className="h-3.5 w-3.5" />
              {lang === "en" && item.labelEn ? item.labelEn : item.label}
            </Link>
          );
        })}
      </div>
    );
  }

  // Drawer variant
  return (
    <div className="space-y-0.5">
      {actions.map((item) => {
        const Icon = resolveIcon(item.icon);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-primary/5 transition-colors"
          >
            <Icon className="h-4 w-4 text-primary" />
            {lang === "en" && item.labelEn ? item.labelEn : item.label}
          </Link>
        );
      })}
    </div>
  );
}
