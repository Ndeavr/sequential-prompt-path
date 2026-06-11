import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const PHASES = [
  "Analyse de votre territoire…",
  "Lecture des signaux IA…",
  "Projection sur 5 ans en cours…",
  "Préparation de votre rapport…",
];

export default function VisionLoadingState() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPhase((p) => (p + 1) % PHASES.length), 1800);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 px-4">
      <div className="relative h-16 w-16">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full border-2 border-cyan-300/30 border-t-cyan-300"
        />
      </div>
      <motion.p
        key={phase}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-readable-body text-sm tracking-wide"
      >
        {PHASES[phase]}
      </motion.p>
    </div>
  );
}
