import { ShieldCheck, Users, Target, MapPin } from "lucide-react";

export default function SectionNoSharedLeadsGoal() {
  const cards = [
    { icon: ShieldCheck, title: "Moins de compétition inutile", desc: "Pas de course contre 5 ou 6 entrepreneurs pour le même client." },
    { icon: Users, title: "Plus de compatibilité", desc: "Le matching est basé sur votre domaine, votre territoire et vos objectifs." },
    { icon: Target, title: "Moins de soumissions perdues", desc: "Chaque rendez-vous est mieux aligné avec votre profil." },
    { icon: MapPin, title: "Plus de chances de fermer", desc: "Des clients plus sérieux, plus proches, plus compatibles." },
  ];

  return (
    <section className="py-16 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          Pas de leads partagés à 5 ou 6 entrepreneurs.
        </h2>
        <p className="text-muted-foreground mb-10 max-w-xl mx-auto">
          UNPRO ne vend pas le même client à plusieurs entreprises en même temps.
          Le système cherche des rendez-vous plus sérieux, plus compatibles, mieux alignés.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cards.map(c => (
            <div key={c.title} className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-5 text-left">
              <c.icon className="w-5 h-5 text-primary mb-3" />
              <p className="font-semibold text-foreground mb-1">{c.title}</p>
              <p className="text-sm text-muted-foreground">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
