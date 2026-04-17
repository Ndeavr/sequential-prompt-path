/**
 * PanelCalendarConnectionBenefits — value props by role.
 */
import { Clock, Shield, Sparkles, Zap } from "lucide-react";

const benefitsByRole: Record<string, { icon: typeof Clock; title: string; desc: string }[]> = {
  homeowner: [
    { icon: Clock, title: "Plus d'aller-retour", desc: "Alex propose seulement des heures qui marchent vraiment pour vous." },
    { icon: Shield, title: "Vous contrôlez tout", desc: "On lit votre disponibilité. Rien n'est réservé sans votre accord." },
    { icon: Sparkles, title: "Suggestions précises", desc: "Adaptées à votre vrai horaire, en quelques secondes." },
  ],
  contractor: [
    { icon: Zap, title: "Seulement les bons RDV", desc: "Vos chantiers sont respectés. Aucun double-booking." },
    { icon: Clock, title: "Rendez-vous qui fittent", desc: "UNPRO insère uniquement entre vos blocs occupés." },
    { icon: Shield, title: "Données protégées", desc: "Aucun événement personnel n'est partagé. Lecture disponibilité seulement." },
  ],
  professional: [
    { icon: Clock, title: "Timing parfait", desc: "Les clients sont planifiés quand vous êtes vraiment disponible." },
    { icon: Sparkles, title: "Réservations fluides", desc: "Plus de conflits, plus de re-planification." },
    { icon: Shield, title: "Privé par défaut", desc: "On lit la disponibilité, pas le contenu de vos événements." },
  ],
};

export default function PanelCalendarConnectionBenefits({ role }: { role: string }) {
  const items = benefitsByRole[role] ?? benefitsByRole.homeowner;
  return (
    <div className="space-y-3">
      {items.map((b) => {
        const Icon = b.icon;
        return (
          <div key={b.title} className="flex items-start gap-3 p-3 rounded-xl bg-muted/15 border border-border/20">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{b.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{b.desc}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
