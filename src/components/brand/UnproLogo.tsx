/**
 * UNPRO — Primary Logo (SVG, animated, multi-variant)
 */
type UnproLogoProps = {
  size?: number;
  variant?: "primary" | "mono" | "blue" | "rubber";
  animated?: boolean;
  showWordmark?: boolean;
  className?: string;
};

const palettes = {
  primary: { border: "#9CA3AF", u: "#E5E7EB", text: "#E5E7EB", starCore: "#3B82F6", starGlow: "#60A5FA" },
  mono: { border: "#FFFFFF", u: "#FFFFFF", text: "#FFFFFF", starCore: "#FFFFFF", starGlow: "#FFFFFF" },
  blue: { border: "#60A5FA", u: "#DBEAFE", text: "#60A5FA", starCore: "#3B82F6", starGlow: "#93C5FD" },
  rubber: { border: "#2A2A2A", u: "#3A3A3A", text: "#2F2F2F", starCore: "#6B7280", starGlow: "#9CA3AF" },
} as const;

const animStyles = `
  .unpro-icon-stroke{stroke-dasharray:220;stroke-dashoffset:220;animation:unpro-draw .6s ease-out forwards}
  .unpro-u-shape{stroke-dasharray:160;stroke-dashoffset:160;animation:unpro-draw .5s ease-out .15s forwards}
  .unpro-wordmark{opacity:0;transform:translateX(10px);animation:unpro-reveal .45s ease-out .35s forwards}
  .unpro-star-core{opacity:0;transform-origin:66px 14px;animation:unpro-star-pop .25s ease-out .45s forwards,unpro-star-pulse 2.2s ease-in-out .8s infinite}
  .unpro-star-glow{opacity:0;transform-origin:66px 14px;animation:unpro-star-glow-in .25s ease-out .45s forwards,unpro-star-breathe 2.2s ease-in-out .8s infinite}
  @keyframes unpro-draw{to{stroke-dashoffset:0}}
  @keyframes unpro-reveal{to{opacity:1;transform:translateX(0)}}
  @keyframes unpro-star-pop{0%{opacity:0;transform:scale(.4)}100%{opacity:1;transform:scale(1)}}
  @keyframes unpro-star-glow-in{0%{opacity:0;transform:scale(.6)}100%{opacity:.32;transform:scale(1)}}
  @keyframes unpro-star-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
  @keyframes unpro-star-breathe{0%,100%{opacity:.22}50%{opacity:.42}}
`;

export default function UnproLogo({
  size = 320,
  variant = "primary",
  animated = true,
  showWordmark = true,
  className = "",
}: UnproLogoProps) {
  const h = Math.round(size * 0.25);
  const p = palettes[variant];

  return (
    <svg
      width={size}
      height={h}
      viewBox="0 0 320 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="UNPRO logo"
    >
      {animated && <style>{animStyles}</style>}

      <rect x="8" y="8" width="64" height="64" rx="16" stroke={p.border} strokeWidth="2.5"
        className={animated ? "unpro-icon-stroke" : undefined} />

      <path d="M28 26V48L40 56L52 48V26" stroke={p.u} strokeWidth="4.5"
        strokeLinecap="round" strokeLinejoin="round"
        className={animated ? "unpro-u-shape" : undefined} />

      <circle cx="66" cy="14" r="3.2" fill={p.starCore}
        className={animated ? "unpro-star-core" : undefined} />
      <circle cx="66" cy="14" r="8" fill={p.starGlow}
        opacity={animated ? undefined : 0.28}
        className={animated ? "unpro-star-glow" : undefined} />

      {showWordmark && (
        <g className={animated ? "unpro-wordmark" : undefined}>
          <text x="90" y="52" fill={p.text}
            fontFamily="Inter, Arial, sans-serif" fontSize="32"
            fontWeight="600" letterSpacing="1.2">
            UNPRO
          </text>
        </g>
      )}
    </svg>
  );
}
