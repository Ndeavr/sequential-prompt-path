import { motion } from "framer-motion";
import type { FlywheelNodeData } from "./flywheelData";

interface Props {
  nodes: FlywheelNodeData[];
  activeId: number | null;
  radius: number;
  center: number;
}

export const FlywheelConnectionPaths = ({ nodes, activeId, radius, center }: Props) => {
  const total = nodes.length;

  const getPos = (index: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    return {
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
    };
  };

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox={`0 0 ${center * 2} ${center * 2}`}
    >
      <defs>
        <linearGradient id="flywheel-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(222 100% 65%)" stopOpacity="0.3" />
          <stop offset="50%" stopColor="hsl(252 100% 72%)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="hsl(195 100% 55%)" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {/* Connection arcs between consecutive nodes */}
      {nodes.map((_, i) => {
        const from = getPos(i);
        const to = getPos((i + 1) % total);
        const isActiveEdge =
          activeId !== null &&
          (nodes[i].id === activeId || nodes[(i + 1) % total].id === activeId);

        return (
          <motion.line
            key={i}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="url(#flywheel-grad)"
            strokeWidth={isActiveEdge ? 2 : 1}
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: 1,
              opacity: isActiveEdge ? 0.8 : 0.25,
            }}
            transition={{ delay: 0.1 * i, duration: 0.8 }}
          />
        );
      })}

      {/* Outer orbit ring */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="hsl(222 100% 65%)"
        strokeWidth="0.5"
        strokeDasharray="4 8"
        opacity="0.12"
      />
    </svg>
  );
};
