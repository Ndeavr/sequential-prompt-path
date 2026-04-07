import { MessageCircle, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GoalResults } from "@/hooks/useGoalToPlanEngine";

interface Props {
  results: GoalResults | null;
  onAlex: () => void;
}

const PLAN_LABELS: Record<string, string> = {
  recrue: "Recrue",
  pro: "Pro",
  premium: "Premium",
  elite: "Élite",
  signature: "Signature",
};

export default function SectionAlexAdvisor({ results, onAlex }: Props) {
  const fmt = (n: number) => n.toLocaleString("fr-CA", { maximumFractionDigits: 0 });

  const messages = results
    ? [
        `Je vois que votre score actuel est d'environ 41/100.`,
        `Vous perdez environ ${fmt(results.lostRevenueMin)}$ à ${fmt(results.lostRevenueMax)}$ par mois.`,
        `Pour atteindre votre objectif, il vous faut environ ${results.requiredAppointmentsMonthly} rendez-vous qualifiés par mois.`,
        `Le plan le plus logique pour vous est ${PLAN_LABELS[results.recommendedPlan] || results.recommendedPlan}.`,
      ]
    : [
        "Entrez vos chiffres pour que je puisse analyser votre situation.",
        "Je pourrai ensuite vous montrer ce que vous laissez sur la table.",
        "Et vous recommander le bon plan selon vos objectifs.",
      ];

  return (
    <section className="py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Bot className="w-6 h-6 text-accent mx-auto mb-3" />
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Alex, votre conseiller IA</h2>
          <p className="text-muted-foreground">Alex analyse vos résultats et vous guide.</p>
        </div>

        <div className="rounded-2xl border border-accent/20 bg-accent/5 backdrop-blur-sm p-6 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-accent" />
              </div>
              <p className="text-sm text-foreground leading-relaxed">{msg}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-6 justify-center">
          <Button onClick={onAlex} className="gap-2 bg-gradient-to-r from-accent to-primary text-primary-foreground">
            <MessageCircle className="w-4 h-4" /> Parler à Alex maintenant
          </Button>
          <Button variant="outline" size="sm" className="text-muted-foreground">
            Me faire expliquer le calcul
          </Button>
        </div>
      </div>
    </section>
  );
}
