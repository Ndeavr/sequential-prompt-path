import { CheckCircle2, Star, MessageCircle } from "lucide-react";

export default function SectionWhatHomeownerSees() {
  return (
    <section className="bg-background py-16 md:py-24 px-5">
      <div className="max-w-3xl mx-auto">
        <p className="text-xs tracking-[0.2em] text-primary font-medium mb-3 text-center">
          CE QUE VOIT LE PROPRIÉTAIRE
        </p>
        <h2 className="text-2xl md:text-4xl font-bold text-foreground text-center mb-10 md:mb-14">
          Une seule recommandation. <span className="text-primary">La bonne.</span>
        </h2>

        <div className="space-y-4">
          {/* User question */}
          <div className="flex gap-3 items-start">
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
              <p className="text-sm md:text-base text-foreground">
                Quel entrepreneur me recommandez-vous pour refaire ma toiture à Laval ?
              </p>
            </div>
          </div>

          {/* Alex answer */}
          <div className="flex gap-3 items-start">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-glow">
              <span className="text-primary-foreground text-xs font-bold">A</span>
            </div>
            <div className="bg-primary/8 border border-primary/25 rounded-2xl rounded-tl-sm px-4 py-4 md:px-5 md:py-5 max-w-[90%] w-full">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <p className="font-semibold text-foreground">Entreprise recommandée</p>
              </div>
              <ul className="space-y-2 text-sm text-foreground/85">
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span> RBQ vérifiée
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span> Spécialiste toiture
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span> Disponibilités cette semaine
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span> Performance vérifiée
                </li>
              </ul>
              <div className="flex gap-0.5 mt-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
