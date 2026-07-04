/**
 * PrimaryCTA — renders one canonical UNPRO CTA button.
 * Marks the DOM with `data-cta-canonical` so <MobileQAOverlay> can verify
 * every page has at least one visible primary action.
 */
import { Link } from "react-router-dom";
import { resolveCTA, type CanonicalCTA } from "@/config/ctaRegistry";

interface PrimaryCTAProps {
  cta: CanonicalCTA;
  label?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary";
  className?: string;
  onClick?: () => void;
}

const sizeClasses: Record<string, string> = {
  sm: "h-10 px-4 text-sm",
  md: "h-12 px-6 text-base",
  lg: "h-14 px-8 text-base",
};

export default function PrimaryCTA({
  cta,
  label,
  size = "md",
  variant = "primary",
  className = "",
  onClick,
}: PrimaryCTAProps) {
  const desc = resolveCTA(cta);
  const isPrimary = variant === "primary";
  const base =
    "inline-flex items-center justify-center rounded-[18px] font-medium tracking-tight transition-all duration-[420ms] ease-[cubic-bezier(.22,1,.36,1)] hover:-translate-y-[2px] active:translate-y-0";
  const style = isPrimary
    ? "bg-white text-black shadow-[0_10px_30px_-10px_rgba(255,255,255,0.35)]"
    : "bg-white/8 text-white border border-white/12 backdrop-blur-xl";

  return (
    <Link
      to={desc.href}
      data-cta-canonical={cta}
      data-analytics-id={desc.analyticsId}
      onClick={onClick}
      className={[base, style, sizeClasses[size], className].filter(Boolean).join(" ")}
    >
      {label ?? desc.label}
    </Link>
  );
}
