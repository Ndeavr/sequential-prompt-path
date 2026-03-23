/**
 * AlexModuleSwitcher — Switch between Alex modes/copilots.
 */
import { motion } from "framer-motion";
import { Home, Building2, Briefcase, Shield } from "lucide-react";

type AlexModule = "homeowner" | "contractor" | "condo" | "admin";

const MODULES: Array<{ key: AlexModule; label: string; icon: typeof Home }> = [
  { key: "homeowner", label: "Maison", icon: Home },
  { key: "contractor", label: "Entrepreneur", icon: Briefcase },
  { key: "condo", label: "Condo", icon: Building2 },
  { key: "admin", label: "Admin", icon: Shield },
];

interface AlexModuleSwitcherProps {
  active: AlexModule;
  onChange: (module: AlexModule) => void;
  availableModules?: AlexModule[];
}

export default function AlexModuleSwitcher({ active, onChange, availableModules }: AlexModuleSwitcherProps) {
  const visible = MODULES.filter(m => !availableModules || availableModules.includes(m.key));

  return (
    <div className="flex items-center gap-1 rounded-full bg-muted/50 p-1">
      {visible.map(mod => {
        const isActive = mod.key === active;
        return (
          <button
            key={mod.key}
            onClick={() => onChange(mod.key)}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="alex-module-bg"
                className="absolute inset-0 rounded-full bg-primary shadow-sm"
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              />
            )}
            <mod.icon className="h-3.5 w-3.5 relative z-10" />
            <span className="relative z-10 hidden sm:inline">{mod.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export type { AlexModule };
