/**
 * UNPRO — Icon-only (SVG, multi-variant)
 */
type UnproIconProps = {
  size?: number;
  variant?: "primary" | "mono" | "blue" | "rubber";
  className?: string;
};

const palettes = {
  primary: { border: "#9CA3AF", u: "#E5E7EB", starCore: "#3B82F6", starGlow: "#60A5FA" },
  mono: { border: "#FFFFFF", u: "#FFFFFF", starCore: "#FFFFFF", starGlow: "#FFFFFF" },
  blue: { border: "#60A5FA", u: "#DBEAFE", starCore: "#3B82F6", starGlow: "#93C5FD" },
  rubber: { border: "#2A2A2A", u: "#3A3A3A", starCore: "#6B7280", starGlow: "#9CA3AF" },
} as const;

export default function UnproIcon({ size = 64, variant = "primary", className = "" }: UnproIconProps) {
  const p = palettes[variant];
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none"
      xmlns="http://www.w3.org/2000/svg" className={className}
      role="img" aria-label="UNPRO icon">
      <rect x="8" y="8" width="64" height="64" rx="16" stroke={p.border} strokeWidth="2.5" />
      <path d="M28 26V48L40 56L52 48V26" stroke={p.u} strokeWidth="4.5"
        strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="66" cy="14" r="3.2" fill={p.starCore} />
      <circle cx="66" cy="14" r="8" fill={p.starGlow} opacity="0.28" />
    </svg>
  );
}
