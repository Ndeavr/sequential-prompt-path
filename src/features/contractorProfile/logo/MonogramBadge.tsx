/**
 * UNPRO — Branded monogram fallback for contractors without a verified logo.
 * Rendered inside a premium glass card. Never show "missing logo" to users.
 */
import { cn } from "@/lib/utils";
import type { ContractorLogo } from "../generator/pageTypes";

interface Props {
  monogram: ContractorLogo["monogram"];
  size?: number;
  className?: string;
}

export default function MonogramBadge({ monogram, size = 96, className }: Props) {
  const initials = monogram.initials.slice(0, 3).toUpperCase();
  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center rounded-2xl border border-white/10 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)]",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${monogram.bg}, ${monogram.bg}CC)`,
      }}
      aria-label={`Logo ${initials}`}
    >
      <span
        className="font-semibold tracking-tight"
        style={{
          color: monogram.fg,
          fontSize: Math.round(size * 0.42),
          letterSpacing: "-0.04em",
        }}
      >
        {initials}
      </span>
      <span
        aria-hidden
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{ background: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.15), transparent 60%)" }}
      />
    </div>
  );
}

/** Deterministic monogram initials from a business name. */
export function computeMonogramInitials(businessName: string): string {
  const words = businessName
    .replace(/[^A-Za-zÀ-ÿ0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !/^(inc|ltee|ltée|ltd|enr|sencrl|the|le|la|les|and|et)$/i.test(w));
  if (!words.length) return businessName.slice(0, 3).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 3).map((w) => w[0]).join("").toUpperCase();
}
