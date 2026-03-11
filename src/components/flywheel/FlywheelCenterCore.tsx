import { motion } from "framer-motion";

export const FlywheelCenterCore = () => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
    {/* Outer glow rings */}
    <motion.div
      className="absolute w-36 h-36 md:w-48 md:h-48 rounded-full"
      style={{
        background: "radial-gradient(circle, hsl(222 100% 65% / 0.08) 0%, transparent 70%)",
      }}
      animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.3, 0.6] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute w-28 h-28 md:w-36 md:h-36 rounded-full"
      style={{
        background: "radial-gradient(circle, hsl(252 100% 72% / 0.1) 0%, transparent 70%)",
      }}
      animate={{ scale: [1.1, 1, 1.1], opacity: [0.4, 0.6, 0.4] }}
      transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
    />

    {/* Core circle */}
    <motion.div
      className="relative w-20 h-20 md:w-28 md:h-28 rounded-full border border-border/40 bg-card/80 backdrop-blur-xl flex items-center justify-center z-10"
      style={{
        boxShadow: "0 0 40px -8px hsl(222 100% 65% / 0.15), inset 0 1px 0 hsl(0 0% 100% / 0.06)",
      }}
      animate={{ boxShadow: [
        "0 0 30px -8px hsl(222 100% 65% / 0.12), inset 0 1px 0 hsl(0 0% 100% / 0.06)",
        "0 0 50px -8px hsl(222 100% 65% / 0.22), inset 0 1px 0 hsl(0 0% 100% / 0.06)",
        "0 0 30px -8px hsl(222 100% 65% / 0.12), inset 0 1px 0 hsl(0 0% 100% / 0.06)",
      ]}}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    >
      <div className="text-center px-1">
        <p className="text-[0.5rem] md:text-[0.6rem] font-display font-bold text-primary leading-tight tracking-wide uppercase">
          UNPRO
        </p>
        <p className="text-[0.4rem] md:text-[0.5rem] text-muted-foreground leading-tight mt-0.5">
          Intelligence
        </p>
      </div>
    </motion.div>
  </div>
);
