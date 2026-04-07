import { Calculator, MessageCircle, MapPin, TrendingUp, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onCalculate: () => void;
  onAlex: () => void;
  onCheckCity: () => void;
}

export default function HeroSectionSelfServe({ onCalculate, onAlex, onCheckCity }: Props) {
  return (
    <section className="relative pt-20 pb-16 px-4 overflow-hidden">
      {/* Aura background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-accent/8 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-6xl mx-auto">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm font-medium mb-6">
            <Calculator className="w-4 h-4" />
            Calculateur autonome
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground mb-4 font-display">
            Calculez vous-même combien de{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              rendez-vous
            </span>{" "}
            il vous faut
          </h1>

          <p className="text-lg text-muted-foreground mb-4 max-w-2xl mx-auto">
            …et quel plan UNPRO choisir. Moins de soumissions.
            Plus de contrats. Des clients sérieux et compatibles.
          </p>

          <ul className="flex flex-col items-start mx-auto max-w-md gap-2 text-sm text-muted-foreground mb-8">
            {[
              "Pas besoin de refaire votre site web",
              "Pas besoin de comprendre le SEO",
              "Pas de leads partagés à 5 ou 6 entrepreneurs",
              "Places limitées par ville",
              "Exclusivité possible selon le territoire",
            ].map(t => (
              <li key={t} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                {t}
              </li>
            ))}
          </ul>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" onClick={onCalculate} className="w-full sm:w-auto gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground">
              <Target className="w-4 h-4" /> Calculer mon plan
            </Button>
            <Button variant="outline" size="lg" onClick={onAlex} className="w-full sm:w-auto gap-2">
              <MessageCircle className="w-4 h-4" /> Parler à Alex
            </Button>
            <Button variant="ghost" size="lg" onClick={onCheckCity} className="w-full sm:w-auto gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" /> Vérifier ma ville
            </Button>
          </div>
        </div>

        {/* Preview widgets */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-12 max-w-2xl mx-auto">
          {[
            { label: "Score pré-UNPRO", value: "41/100", icon: TrendingUp, color: "text-warning" },
            { label: "Perte estimée", value: "~18 000$/mo", icon: TrendingUp, color: "text-destructive" },
            { label: "RDV requis", value: "~12/mo", icon: Target, color: "text-accent" },
            { label: "Confiance plan", value: "86%", icon: Calculator, color: "text-primary" },
          ].map(w => (
            <div key={w.label} className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-3 text-center">
              <w.icon className={`w-4 h-4 mx-auto mb-1 ${w.color}`} />
              <p className={`text-lg font-bold ${w.color}`}>{w.value}</p>
              <p className="text-[10px] text-muted-foreground">{w.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
