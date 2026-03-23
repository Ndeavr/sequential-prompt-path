import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";

interface CtaConfig {
  label: string;
  to: string;
}

interface CTASectionProps {
  title: string;
  description: string;
  primaryCta: CtaConfig;
  secondaryCta?: CtaConfig;
  variant?: "default" | "accent" | "subtle";
}

const ALEX_ROUTES = ["/alex", "/parler-a-alex"];

export default function CTASection({ title, description, primaryCta, secondaryCta, variant = "default" }: CTASectionProps) {
  const { openAlex } = useAlexVoice();

  const bg = variant === "accent"
    ? "bg-primary/5 border-primary/20"
    : variant === "subtle"
    ? "bg-muted/50 border-border/50"
    : "bg-card border-border";

  const renderCta = (cta: CtaConfig, isPrimary: boolean) => {
    const isAlex = ALEX_ROUTES.includes(cta.to);
    if (isAlex) {
      return (
        <Button
          size="lg"
          variant={isPrimary ? "default" : "outline"}
          className={isPrimary ? "gap-2" : ""}
          onClick={() => openAlex("general")}
        >
          {cta.label} {isPrimary && <ArrowRight className="h-4 w-4" />}
        </Button>
      );
    }
    return (
      <Button asChild size="lg" variant={isPrimary ? "default" : "outline"} className={isPrimary ? "gap-2" : ""}>
        <Link to={cta.to}>{cta.label} {isPrimary && <ArrowRight className="h-4 w-4" />}</Link>
      </Button>
    );
  };

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
        {renderCta(primaryCta, true)}
        {secondaryCta && renderCta(secondaryCta, false)}
      </div>
    </motion.div>
  );
}
