/**
 * ThemeSwitcher — Light / Auto / Dark control.
 * Segmented control on desktop, compact cycling button on mobile.
 */
import { Sun, Moon, MonitorSmartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useThemeToggle } from "@/hooks/useThemeToggle";
import type { ThemeMode } from "@/lib/theme/themeStore";
import { trackCopilotEvent } from "@/utils/trackCopilotEvent";

const OPTIONS: { value: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Clair", Icon: Sun },
  { value: "system", label: "Automatique", Icon: MonitorSmartphone },
  { value: "dark", label: "Sombre", Icon: Moon },
];

interface Props {
  className?: string;
  /** `compact` = single cycling button (mobile / dense headers). */
  variant?: "segmented" | "compact" | "light-dark";
}

export default function ThemeSwitcher({ className, variant = "segmented" }: Props) {
  const { mode, setTheme } = useThemeToggle();

  const select = (next: ThemeMode) => {
    setTheme(next);
    trackCopilotEvent("theme_changed", { mode: next });
  };

  if (variant === "compact") {
    const current = OPTIONS.find((o) => o.value === mode) ?? OPTIONS[2];
    const next = OPTIONS[(OPTIONS.indexOf(current) + 1) % OPTIONS.length];
    const Icon = current.Icon;
    return (
      <button
        type="button"
        onClick={() => select(next.value)}
        aria-label={`Thème : ${current.label}. Passer à ${next.label}`}
        className={cn(
          "inline-flex h-10 w-10 items-center justify-center rounded-full",
          "border border-border/60 bg-card/60 text-foreground backdrop-blur-md",
          "transition-transform duration-200 hover:-translate-y-0.5 active:scale-95",
          className,
        )}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </button>
    );
  }

  const visibleOptions = variant === "light-dark"
    ? OPTIONS.filter(({ value }) => value !== "system")
    : OPTIONS;

  return (
    <div
      role="radiogroup"
      aria-label="Thème de l'interface"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-card/50 p-0.5 backdrop-blur-md",
        className,
      )}
    >
      {visibleOptions.map(({ value, label, Icon }) => {
        const active = mode === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => select(value)}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-200",
              active
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
