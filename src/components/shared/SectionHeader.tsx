import { ReactNode } from "react";
import { motion } from "framer-motion";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
}

export default function SectionHeader({ title, subtitle, children, className = "" }: SectionHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`space-y-2 ${className}`}
    >
      <h2 className="text-2xl md:text-3xl font-bold text-foreground font-display">{title}</h2>
      {subtitle && <p className="text-muted-foreground max-w-2xl">{subtitle}</p>}
      {children}
    </motion.div>
  );
}
