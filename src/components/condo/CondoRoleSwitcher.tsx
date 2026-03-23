/**
 * UNPRO — Condo Role Switcher Tabs
 * Allows switching between Owner / Manager / Board views.
 */
import { useCondoRole, type CondoRole } from "@/hooks/useCondoRole";
import { User, Settings, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const roles: { key: CondoRole; label: string; labelEn: string; icon: typeof User; color: string }[] = [
  { key: "condo_owner", label: "Propriétaire", labelEn: "Owner", icon: User, color: "text-primary" },
  { key: "condo_manager", label: "Gestionnaire", labelEn: "Manager", icon: Settings, color: "text-secondary" },
  { key: "condo_board", label: "Syndicat / CA", labelEn: "Board", icon: Shield, color: "text-amber-500" },
];

export default function CondoRoleSwitcher() {
  const { condoRole, setCondoRole } = useCondoRole();

  return (
    <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-xl border border-border/20">
      {roles.map((r) => {
        const active = condoRole === r.key;
        return (
          <button
            key={r.key}
            onClick={() => setCondoRole(r.key)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              active
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <r.icon className={cn("h-4 w-4", active ? r.color : "")} />
            <span className="hidden sm:inline">{r.label}</span>
          </button>
        );
      })}
    </div>
  );
}
