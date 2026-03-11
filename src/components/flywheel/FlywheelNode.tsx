import { motion } from "framer-motion";
import type { FlywheelNodeData } from "./flywheelData";

interface Props {
  node: FlywheelNodeData;
  index: number;
  total: number;
  isActive: boolean;
  onSelect: (id: number) => void;
  radius: number;
}

export const FlywheelNode = ({ node, index, total, isActive, onSelect, radius }: Props) => {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;
  const Icon = node.icon;

  return (
    <motion.button
      className="absolute flex flex-col items-center gap-1 group cursor-pointer focus:outline-none"
      style={{
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
        transform: "translate(-50%, -50%)",
      }}
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.15 * index, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => onSelect(node.id)}
      whileHover={{ scale: 1.12 }}
      whileTap={{ scale: 0.97 }}
    >
      {/* Glow ring */}
      <motion.div
        className="absolute -inset-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle, hsl(${node.glowColor} / ${isActive ? 0.25 : 0.15}) 0%, transparent 70%)`,
        }}
        animate={isActive ? { opacity: [0.5, 0.8, 0.5] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      />

      {/* Icon circle */}
      <div
        className={`relative w-10 h-10 md:w-14 md:h-14 rounded-full border flex items-center justify-center transition-all duration-300 ${
          isActive
            ? "border-primary/50 bg-card/90 shadow-glow"
            : "border-border/40 bg-card/70 hover:border-primary/30"
        }`}
        style={{
          backdropFilter: "blur(12px)",
          boxShadow: isActive ? `0 0 24px -4px hsl(${node.glowColor} / 0.3)` : undefined,
        }}
      >
        <Icon className={`w-4 h-4 md:w-5 md:h-5 ${node.colorClass} transition-colors`} />
      </div>

      {/* Label */}
      <span className={`text-[0.55rem] md:text-[0.65rem] font-semibold text-center leading-tight max-w-16 md:max-w-20 transition-colors ${
        isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
      }`}>
        {node.label}
      </span>
    </motion.button>
  );
};
