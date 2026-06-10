/**
 * PropertyIntelligenceGraph — SVG animé du carnet de vie de la maison.
 * Maison centrale + nœuds en orbite (factures, inspections, garanties, subventions,
 * entrepreneurs, équipements, entretien, rénovations) reliés par des lignes douces.
 *
 * Pas de Three.js / WebGL — SVG pur + Framer Motion.
 */
import { motion } from "framer-motion";
import {
  FileText, ClipboardCheck, ShieldCheck, Award, HardHat,
  Hammer, Wrench, Cpu, Home as HomeIcon,
} from "lucide-react";

interface Props {
  variant?: "hero" | "compact";
  className?: string;
}

const NODES = [
  { Icon: FileText,       label: "Factures",      angle: -90,  color: "#7DD3FC" },
  { Icon: ClipboardCheck, label: "Inspections",   angle: -45,  color: "#A78BFA" },
  { Icon: ShieldCheck,    label: "Garanties",     angle: 0,    color: "#34D399" },
  { Icon: Award,          label: "Subventions",   angle: 45,   color: "#FBBF24" },
  { Icon: HardHat,        label: "Entrepreneurs", angle: 90,   color: "#60A5FA" },
  { Icon: Hammer,         label: "Rénovations",   angle: 135,  color: "#F472B6" },
  { Icon: Wrench,         label: "Entretien",     angle: 180,  color: "#22D3EE" },
  { Icon: Cpu,            label: "Équipements",   angle: 225,  color: "#C084FC" },
];

export default function PropertyIntelligenceGraph({ variant = "hero", className = "" }: Props) {
  const size = variant === "hero" ? 360 : 260;
  const radius = variant === "hero" ? 140 : 100;
  const showLabels = variant === "hero";
  const center = size / 2;

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Halo radial */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle at center, rgba(56,189,248,0.22) 0%, rgba(99,102,241,0.10) 35%, transparent 70%)",
          filter: "blur(8px)",
        }}
      />

      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        className="relative z-10"
        aria-hidden
      >
        {/* Orbites concentriques */}
        <circle cx={center} cy={center} r={radius * 0.55} fill="none"
          stroke="rgba(255,255,255,0.04)" strokeDasharray="2 6" />
        <circle cx={center} cy={center} r={radius} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeDasharray="2 8" />

        {/* Lignes d'énergie pulsantes */}
        {NODES.map((n, i) => {
          const rad = (n.angle * Math.PI) / 180;
          const x = center + Math.cos(rad) * radius;
          const y = center + Math.sin(rad) * radius;
          return (
            <motion.line
              key={`line-${i}`}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke={n.color}
              strokeOpacity={0.35}
              strokeWidth={1}
              strokeDasharray="3 6"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: [0.15, 0.55, 0.15] }}
              transition={{
                pathLength: { duration: 1.2, delay: 0.1 * i, ease: [0.22, 1, 0.36, 1] },
                opacity: { duration: 3, repeat: Infinity, delay: 0.2 * i },
              }}
            />
          );
        })}

        {/* Halo central glow */}
        <motion.circle
          cx={center}
          cy={center}
          r={36}
          fill="url(#centerGlow)"
          animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: `${center}px ${center}px` }}
        />
        <defs>
          <radialGradient id="centerGlow">
            <stop offset="0%" stopColor="rgba(56,189,248,0.85)" />
            <stop offset="60%" stopColor="rgba(99,102,241,0.35)" />
            <stop offset="100%" stopColor="rgba(99,102,241,0)" />
          </radialGradient>
        </defs>
      </svg>

      {/* Maison centrale */}
      <div
        className="absolute z-20 flex items-center justify-center rounded-2xl"
        style={{
          left: center - 28,
          top: center - 28,
          width: 56,
          height: 56,
          background: "linear-gradient(135deg, rgba(56,189,248,0.18), rgba(99,102,241,0.18))",
          border: "1px solid rgba(255,255,255,0.12)",
          backdropFilter: "blur(16px)",
          boxShadow: "0 8px 32px -8px rgba(56,189,248,0.45)",
        }}
      >
        <HomeIcon size={24} strokeWidth={1.8} color="#E0F2FE" />
      </div>

      {/* Nœuds en orbite */}
      {NODES.map((n, i) => {
        const rad = (n.angle * Math.PI) / 180;
        const x = center + Math.cos(rad) * radius;
        const y = center + Math.sin(rad) * radius;
        const Icon = n.Icon;
        const nodeSize = variant === "hero" ? 44 : 36;
        return (
          <motion.div
            key={n.label}
            className="absolute z-20 flex flex-col items-center"
            style={{ left: x - nodeSize / 2, top: y - nodeSize / 2 }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 * i + 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="flex items-center justify-center rounded-2xl"
              style={{
                width: nodeSize,
                height: nodeSize,
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${n.color}40`,
                backdropFilter: "blur(20px)",
                boxShadow: `0 4px 16px -4px ${n.color}55`,
              }}
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 3 + i * 0.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Icon size={variant === "hero" ? 18 : 16} color={n.color} strokeWidth={1.8} />
            </motion.div>
            {showLabels && (
              <span
                className="mt-1.5 text-[9px] font-medium tracking-wide whitespace-nowrap"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                {n.label}
              </span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
