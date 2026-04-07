
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Crown, MessageCircle } from "lucide-react";
import type { FounderPlan } from "@/hooks/useFounderPlans";
import CounterLiveSpots from "./CounterLiveSpots";

interface Props {
  elite?: FounderPlan;
  signature?: FounderPlan;
}

export default function SectionFinalCTAFounder({ elite, signature }: Props) {
  const totalRemaining = (elite?.spots_remaining ?? 30) + (signature?.spots_remaining ?? 30);

  const scrollToPlans = () => {
    document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="px-4 pb-24 pt-8">
      <div className="relative max-w-lg mx-auto text-center space-y-6">
        {/* Glow */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[300px] bg-primary/6 rounded-full blur-[100px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="space-y-4"
        >
          <div className="flex justify-center">
            <CounterLiveSpots remaining={totalRemaining} total={60} />
          </div>

          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            Ne laissez pas quelqu'un d'autre
            <br />
            <span className="text-primary">prendre votre territoire</span>
          </h2>

          <p className="text-sm text-muted-foreground">
            Chaque place prise est un territoire de moins pour vous.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="flex flex-col gap-3"
        >
          <Button variant="premium" size="xl" onClick={scrollToPlans} className="w-full">
            <Crown className="h-4 w-4" /> Réserver maintenant
          </Button>
          <Button variant="outline" size="lg" asChild className="w-full">
            <a href="/alex">
              <MessageCircle className="h-4 w-4" /> Parler à Alex
            </a>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
