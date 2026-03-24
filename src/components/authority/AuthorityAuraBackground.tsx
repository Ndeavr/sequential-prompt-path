import { motion } from "framer-motion";

export default function AuthorityAuraBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <motion.div
        className="absolute -top-1/2 -left-1/4 w-[800px] h-[800px] rounded-full opacity-[0.07] dark:opacity-[0.12]"
        style={{
          background: "radial-gradient(circle, hsl(var(--primary)) 0%, hsl(var(--secondary)) 50%, transparent 70%)",
        }}
        animate={{ x: [0, 60, 0], y: [0, 40, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-1/3 -right-1/4 w-[600px] h-[600px] rounded-full opacity-[0.05] dark:opacity-[0.1]"
        style={{
          background: "radial-gradient(circle, hsl(var(--accent)) 0%, hsl(var(--primary)) 50%, transparent 70%)",
        }}
        animate={{ x: [0, -40, 0], y: [0, -30, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
