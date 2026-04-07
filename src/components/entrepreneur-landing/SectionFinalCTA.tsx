import { motion } from "framer-motion";
import { ArrowRight, MessageCircle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Props {
  onTrackCta: (key: string, section: string) => void;
}

export default function SectionFinalCTA({ onTrackCta }: Props) {
  const navigate = useNavigate();

  return (
    <section className="py-20 px-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/6 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-2xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="space-y-5"
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground font-display leading-tight">
            Vous faites déjà la job.
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Laissez UNPRO vous amener les bons clients.
            </span>
          </h2>

          <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
            {["Score actuel", "Revenus perdus", "Objectifs", "Plan recommandé", "Activation simple"].map((t, i) => (
              <span key={i} className="px-2.5 py-1 rounded-full border border-border/40 bg-card/60">{t}</span>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button
              size="lg"
              className="gap-2 font-bold text-base"
              onClick={() => { onTrackCta("final_score", "final_cta"); navigate("/entrepreneur/score"); }}
            >
              Voir mon score actuel
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="gap-2"
              onClick={() => { onTrackCta("final_alex", "final_cta"); navigate("/alex"); }}
            >
              <MessageCircle className="w-4 h-4" />
              Parler à Alex
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="gap-2 text-muted-foreground"
              onClick={() => { onTrackCta("final_city", "final_cta"); document.getElementById("section-territories")?.scrollIntoView({ behavior: "smooth" }); }}
            >
              <MapPin className="w-4 h-4" />
              Vérifier ma ville
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
