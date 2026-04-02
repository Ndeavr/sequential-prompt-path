/**
 * ThemeToggleInspirations — Premium dual-theme toggle for Inspirations module.
 */
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  isDark: boolean;
  onChange: (dark: boolean) => void;
  className?: string;
}

export default function ThemeToggleInspirations({ isDark, onChange, className }: Props) {
  return (
    <button
      onClick={() => onChange(!isDark)}
      className={cn(
        "relative flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 active:scale-90",
        "bg-muted/60 border border-border/40 hover:bg-muted",
        className,
      )}
      aria-label={isDark ? "Mode clair" : "Mode sombre"}
    >
      {isDark ? (
        <Moon className="h-4 w-4 text-foreground" />
      ) : (
        <Sun className="h-4 w-4 text-foreground" />
      )}
    </button>
  );
}
