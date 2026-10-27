/**
 * Honest enrollment handoff from the legacy founder-plan landing.
 * Never show unverified scarcity or use the retired untaxed pipeline checkout.
 * The base CAD350/12-month profile does not include guaranteed appointments.
 */
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageCircle, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { FounderPlan } from "@/hooks/useFounderPlans";

interface Props {
  elite?: FounderPlan;
  signature?: FounderPlan;
}

export default function SectionFinalCTAFounder(_props: Props) {
  const navigate = useNavigate();
  const handleEnroll = () => {
    const params = new URLSearchParams(window.location.search);
    const runId = params.get("from") ?? params.get("run");
    navigate(runId ? `/contractor/join?run=${encodeURIComponent(runId)}` : "/contractor/join");
  };

  return (
    <section className="px-4 pb-24 pt-8">
      <div className="relative max-w-lg mx-auto text-center space-y-6">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[300px] bg-primary/6 rounded-full blur-[100px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="space-y-4"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            Profil UNPRO · 12 mois de présence
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            Faites connaître votre entreprise aux bons clients
          </h2>
          <p className="text-sm text-muted-foreground">
            Identifiez votre entreprise et découvrez son analyse. Offre de base :
            350 $ CA + taxes applicables, paiement unique pour 12 mois.
            Aucun rendez-vous inclus ou garanti dans l'offre de base.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="flex flex-col gap-3"
        >
          <Button variant="premium" size="xl" onClick={handleEnroll} className="w-full">
            Identifier mon entreprise <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="lg" asChild className="w-full">
            <a href="/alex">
              <MessageCircle className="h-4 w-4 mr-2" /> Parler à Clara
            </a>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
