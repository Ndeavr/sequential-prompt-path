/**
 * ThemeToggle — Premium light/dark toggle for UNPRO.
 * Uses CSS .light class on document root (no next-themes dependency).
 */
import { Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";
import { useThemeToggle } from "@/hooks/useThemeToggle";

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { isDark, toggle } = useThemeToggle();

  return (
    <button
      onClick={toggle}
      className={`relative flex h-8 w-8 items-center justify-center rounded-full bg-muted/60 border border-border/40 transition-colors hover:bg-muted ${className}`}
      aria-label={isDark ? "Mode clair" : "Mode sombre"}
    >
      <motion.div
        key={isDark ? "moon" : "sun"}
        initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
        transition={{ duration: 0.2 }}
      >
        {isDark ? (
          <Moon className="h-4 w-4 text-foreground" />
        ) : (
          <Sun className="h-4 w-4 text-foreground" />
        )}
      </motion.div>
    </button>
  );
}
