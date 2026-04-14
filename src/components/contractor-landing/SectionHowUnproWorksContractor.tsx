import { CheckCircle } from "lucide-react";

const steps = [
  { title: "Parlez à Alex", desc: "Notre IA analyse votre entreprise en 30 secondes." },
  { title: "Recevez votre score", desc: "Visibilité IA, présence locale, avis et conversion." },
  { title: "Activez vos rendez-vous", desc: "Rendez-vous qualifiés, pas des leads génériques." },
];

export default function SectionHowUnproWorksContractor() {
  return (
    <section className="px-4 py-10 max-w-lg mx-auto">
      <h2 className="text-lg font-bold text-center mb-6">Comment ça marche</h2>
      <div className="space-y-4">
        {steps.map((s, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="mt-0.5 flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
              {i + 1}
            </div>
            <div>
              <div className="font-semibold text-sm">{s.title}</div>
              <div className="text-xs text-muted-foreground">{s.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
