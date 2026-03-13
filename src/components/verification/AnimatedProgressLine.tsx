import { motion } from "framer-motion";

interface AnimatedProgressLineProps {
  isActive: boolean;
}

export function AnimatedProgressLine({ isActive }: AnimatedProgressLineProps) {
  if (!isActive) return null;

  return (
    <div className="relative h-[2px] w-full overflow-hidden rounded-full bg-muted/40 mt-2">
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-secondary to-primary"
        initial={{ width: "0%", x: "0%" }}
        animate={{
          width: ["0%", "40%", "70%", "40%", "60%"],
          x: ["0%", "20%", "30%", "60%", "40%"],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      {/* Shimmer overlay */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/10 to-transparent"
        animate={{ x: ["-100%", "200%"] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}
