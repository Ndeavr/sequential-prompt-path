/**
 * CounterCard — Reusable animated counter card with rolling numbers.
 */
import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CounterCardProps {
  label: string;
  value: number;
  formatter: (n: number) => string;
  icon: React.ReactNode;
  accentClass?: string;
  className?: string;
}

export default function CounterCard({ label, value, formatter, icon, accentClass = "text-primary", className }: CounterCardProps) {
  const [display, setDisplay] = useState(formatter(value));
  const prevRef = useRef(value);

  useEffect(() => {
    setDisplay(formatter(value));
    prevRef.current = value;
  }, [value, formatter]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={cn(
        "glass-card p-5 sm:p-6 flex flex-col items-center text-center gap-2 relative overflow-hidden",
        className
      )}
    >
      {/* Subtle glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

      <div className={cn("text-2xl mb-1", accentClass)}>{icon}</div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">{label}</p>
      <p className={cn("text-3xl sm:text-4xl lg:text-5xl font-bold font-display tabular-nums", accentClass)}>
        {display}
      </p>
    </motion.div>
  );
}
