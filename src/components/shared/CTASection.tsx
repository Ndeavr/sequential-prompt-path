import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface CTASectionProps {
  title: string;
  description: string;
  primaryCta: { label: string; to: string };
  secondaryCta?: { label: string; to: string };
  variant?: "default" | "accent" | "subtle";
}

export default function CTASection({ title, description, primaryCta, secondaryCta, variant = "default" }: CTASectionProps) {
  const bg = variant === "accent"
    ? "bg-primary/5 border-primary/20"
    : variant === "subtle"
    ? "bg-muted/50 border-border/50"
    : "bg-card border-border";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`rounded-2xl border ${bg} p-8 md:p-10 text-center space-y-4`}
    >
      <h3 className="text-xl md:text-2xl font-bold text-foreground">{title}</h3>
      <p className="text-muted-foreground max-w-lg mx-auto">{description}</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <Button asChild size="lg" className="gap-2">
          <Link to={primaryCta.to}>{primaryCta.label} <ArrowRight className="h-4 w-4" /></Link>
        </Button>
        {secondaryCta && (
          <Button asChild variant="outline" size="lg">
            <Link to={secondaryCta.to}>{secondaryCta.label}</Link>
          </Button>
        )}
      </div>
    </motion.div>
  );
}
