import { motion } from "framer-motion";
import { ReactNode } from "react";

interface PageHeroProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  compact?: boolean;
}

export default function PageHero({ title, subtitle, children, compact }: PageHeroProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`${compact ? "py-8 md:py-12" : "py-12 md:py-20"} px-4`}
    >
      <div className="max-w-4xl mx-auto text-center space-y-4">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight font-display">
          {title}
        </h1>
        {subtitle && (
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </motion.section>
  );
}
