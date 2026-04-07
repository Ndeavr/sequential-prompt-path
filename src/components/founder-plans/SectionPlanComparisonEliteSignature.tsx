
import { motion } from "framer-motion";
import type { FounderPlan } from "@/hooks/useFounderPlans";
import CardPlanFounder from "./CardPlanFounder";

interface Props {
  elite?: FounderPlan;
  signature?: FounderPlan;
  isLoading: boolean;
}

export default function SectionPlanComparisonEliteSignature({ elite, signature, isLoading }: Props) {
  if (isLoading) {
    return (
      <section className="px-4 pb-20">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
          {[0, 1].map((i) => (
            <div key={i} className="h-[500px] rounded-2xl bg-muted/10 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 pb-20" id="plans">
      <div className="max-w-4xl mx-auto">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-2xl md:text-3xl font-bold text-center text-foreground mb-10"
        >
          Choisissez votre niveau fondateur
        </motion.h2>

        <div className="grid md:grid-cols-2 gap-6">
          {elite && <CardPlanFounder plan={elite} delay={0} />}
          {signature && <CardPlanFounder plan={signature} recommended delay={0.15} />}
        </div>
      </div>
    </section>
  );
}
