import { motion } from "framer-motion";
import { MessageCircle, ArrowRight, Eye, TrendingDown, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const cards = [
  { icon: Eye, title: "Votre visibilité IA", desc: "Alex explique comment l'IA voit votre entreprise aujourd'hui." },
  { icon: TrendingDown, title: "Vos revenus perdus", desc: "Alex montre ce que vous laissez sur la table chaque mois." },
  { icon: Target, title: "Le bon plan", desc: "Alex recommande le plan selon vos objectifs, domaine et localisation." },
];

const mockConvo = [
  { from: "alex", text: "Je vois que votre score actuel est de 41/100. Vous êtes partiellement visible pour l'IA." },
  { from: "alex", text: "Vous perdez environ 4 200$ par mois en rendez-vous que vous ne captez pas." },
  { from: "alex", text: "Pour atteindre votre objectif, le plan Premium serait le plus logique. On regarde ensemble?" },
];

interface Props {
  onTrackCta: (key: string, section: string) => void;
}

export default function SectionAlexConsultation({ onTrackCta }: Props) {
  const navigate = useNavigate();

  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground font-display mb-3">
            Alex vous guide vers le bon plan.
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            Votre situation, votre potentiel, votre plan — tout expliqué par Alex.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {cards.map((c, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl border border-border/40 bg-card/80 p-5 text-center space-y-2"
            >
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                <c.icon className="w-5 h-5 text-accent" />
              </div>
              <p className="text-sm font-bold text-foreground">{c.title}</p>
              <p className="text-xs text-muted-foreground">{c.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Mock conversation */}
        <div className="max-w-md mx-auto space-y-3 mb-8">
          {mockConvo.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 + i * 0.12 }}
              className="flex items-start gap-2.5"
            >
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <MessageCircle className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="rounded-2xl rounded-tl-md bg-muted/60 border border-border/40 px-3.5 py-2.5 text-xs text-foreground/90">
                {msg.text}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center">
          <Button
            size="lg"
            className="gap-2 font-bold"
            onClick={() => { onTrackCta("alex_consult", "alex"); navigate("/alex"); }}
          >
            <MessageCircle className="w-4 h-4" />
            Parler à Alex maintenant
          </Button>
        </div>
      </div>
    </section>
  );
}
