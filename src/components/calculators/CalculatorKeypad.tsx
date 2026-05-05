/**
 * UNPRO — CalculatorKeypad
 * Premium custom numeric keypad. Replaces native mobile keyboard.
 * Append-only logic on a string raw value (e.g. "1234.56").
 */
import { memo, useCallback } from "react";
import { motion } from "framer-motion";
import { Delete, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type KeyId =
  | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
  | "00" | "000" | "." | "back" | "clear" | "confirm";

interface KeypadProps {
  value: string;
  onChange: (next: string) => void;
  onConfirm?: () => void;
  presets?: number[];
  onTrack?: (event: string, payload?: Record<string, any>) => void;
}

/** Pure reducer-style mutation on a raw string value. */
export function applyKey(raw: string, key: KeyId): string {
  if (key === "clear") return "";
  if (key === "back") return raw.slice(0, -1);
  if (key === "confirm") return raw;

  if (key === ".") {
    if (raw.includes(".")) return raw;
    if (raw === "") return "0.";
    return raw + ".";
  }

  // digit or 00/000
  const digits = key;

  // Decimal precision guard: max 2 decimals
  if (raw.includes(".")) {
    const [, dec = ""] = raw.split(".");
    const remaining = 2 - dec.length;
    if (remaining <= 0) return raw;
    return raw + digits.slice(0, remaining);
  }

  // Leading zero rule: prevent "01", "002" but allow "0" then "."
  if (raw === "0") {
    // Replace the lone zero unless next is "."
    if (digits === "0" || digits === "00" || digits === "000") return "0";
    return digits;
  }
  if (raw === "" && (digits === "00" || digits === "000")) {
    // Don't allow leading 00
    return "0";
  }

  // Cap integer part to 12 digits to keep formatting sane
  const next = raw + digits;
  const intPart = next.split(".")[0];
  if (intPart.length > 12) return raw;
  return next;
}

/** Format raw "1234.5" → "1 234,5" (fr-CA, thin space thousands). */
export function formatRaw(raw: string): string {
  if (!raw) return "";
  const [intPart, decPart] = raw.split(".");
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F");
  return decPart !== undefined ? `${intFormatted},${decPart}` : intFormatted;
}

const KEYS: { id: KeyId; label: string; aria: string; tone?: "num" | "danger" | "confirm" | "muted" }[] = [
  { id: "7", label: "7", aria: "Ajouter 7", tone: "num" },
  { id: "8", label: "8", aria: "Ajouter 8", tone: "num" },
  { id: "9", label: "9", aria: "Ajouter 9", tone: "num" },
  { id: "back", label: "⌫", aria: "Supprimer", tone: "danger" },
  { id: "4", label: "4", aria: "Ajouter 4", tone: "num" },
  { id: "5", label: "5", aria: "Ajouter 5", tone: "num" },
  { id: "6", label: "6", aria: "Ajouter 6", tone: "num" },
  { id: "clear", label: "C", aria: "Effacer", tone: "danger" },
  { id: "1", label: "1", aria: "Ajouter 1", tone: "num" },
  { id: "2", label: "2", aria: "Ajouter 2", tone: "num" },
  { id: "3", label: "3", aria: "Ajouter 3", tone: "num" },
  { id: ".", label: ",", aria: "Ajouter une virgule décimale", tone: "muted" },
  { id: "0", label: "0", aria: "Ajouter 0", tone: "num" },
  { id: "00", label: "00", aria: "Ajouter zéro zéro", tone: "num" },
  { id: "000", label: "000", aria: "Ajouter trois zéros", tone: "num" },
  { id: "confirm", label: "✔", aria: "Confirmer", tone: "confirm" },
];

function vibrate(ms = 8) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(ms);
  } catch { /* noop */ }
}

const CalculatorKeypad = memo(function CalculatorKeypad({
  value,
  onChange,
  onConfirm,
  presets = [100, 500, 1000, 5000],
  onTrack,
}: KeypadProps) {
  const handle = useCallback(
    (key: KeyId) => {
      vibrate(key === "confirm" ? 18 : 6);

      if (key === "confirm") {
        onTrack?.("keypad_confirm", { value });
        onConfirm?.();
        return;
      }
      if (key === "clear") onTrack?.("keypad_clear");
      else if (key === "back") onTrack?.("keypad_delete");
      else onTrack?.("keypad_number_pressed", { key });

      onChange(applyKey(value, key));
    },
    [value, onChange, onConfirm, onTrack],
  );

  const handlePreset = (n: number) => {
    vibrate(10);
    onTrack?.("amount_fast_selected", { value: n });
    onChange(String(n));
  };

  return (
    <div
      role="group"
      aria-label="Clavier numérique du calculateur"
      className="rounded-3xl border border-border/50 bg-background/70 backdrop-blur-xl shadow-2xl p-3 sm:p-4"
    >
      {/* Quick presets */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => handlePreset(p)}
            className="h-9 rounded-xl text-xs font-semibold border border-primary/30 bg-primary/5 text-primary hover:bg-primary/15 active:scale-95 transition"
          >
            {p.toLocaleString("fr-CA")} $
          </button>
        ))}
      </div>

      {/* Keypad grid */}
      <div className="grid grid-cols-4 gap-2">
        {KEYS.map((k) => (
          <KeypadButton key={k.id} label={k.label} aria={k.aria} tone={k.tone} onPress={() => handle(k.id)} />
        ))}
      </div>
    </div>
  );
});

export default CalculatorKeypad;

function KeypadButton({
  label,
  aria,
  tone = "num",
  onPress,
}: {
  label: string;
  aria: string;
  tone?: "num" | "danger" | "confirm" | "muted";
  onPress: () => void;
}) {
  const styles = {
    num: "bg-card/80 hover:bg-card text-foreground border-border/40",
    muted: "bg-muted/60 hover:bg-muted text-foreground border-border/40",
    danger: "bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/30",
    confirm:
      "bg-primary text-primary-foreground border-primary shadow-[0_0_24px_-4px_hsl(var(--primary)/0.6)] hover:opacity-95",
  }[tone];

  return (
    <motion.button
      type="button"
      aria-label={aria}
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 600, damping: 28 }}
      onClick={onPress}
      onPointerDown={(e) => e.preventDefault()}
      className={cn(
        "h-14 sm:h-16 rounded-2xl border font-semibold text-xl tabular-nums select-none",
        "active:brightness-110 transition-colors",
        styles,
      )}
    >
      {label === "⌫" ? <Delete className="h-5 w-5 mx-auto" /> : label === "✔" ? <Check className="h-5 w-5 mx-auto" /> : label}
    </motion.button>
  );
}
