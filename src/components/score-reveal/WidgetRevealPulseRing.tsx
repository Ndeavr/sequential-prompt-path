/**
 * WidgetRevealPulseRing — Pulsing rings during reveal anticipation.
 */
import { motion } from "framer-motion";

interface Props {
  active: boolean;
  children?: React.ReactNode;
}

export default function WidgetRevealPulseRing({ active, children }: Props) {
  if (!active) return <>{children}</>;

  return (
    <div className="relative flex items-center justify-center">
      {[0, 0.4, 0.8].map((delay, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border-2 border-primary/30"
          style={{ width: 160 + i * 40, height: 160 + i * 40 }}
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.4, 0.1, 0.4],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay,
            ease: "easeInOut",
          }}
        />
      ))}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
