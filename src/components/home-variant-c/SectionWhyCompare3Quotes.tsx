import { ArrowRight, Sparkles, CheckCircle2, Star } from "lucide-react";

const QUOTES = [
  { label: "SOUMISSION A", amount: "18 450 $" },
  { label: "SOUMISSION B", amount: "24 780 $" },
  { label: "SOUMISSION C", amount: "15 320 $" },
];

export default function SectionWhyCompare3Quotes() {
  return (
    <section className="bg-muted/40 py-14 md:py-20 px-5">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-4xl font-bold text-foreground text-center mb-10 md:mb-14">
          Pourquoi comparer 3 soumissions ?
        </h2>

        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-4 justify-center">
          {/* 3 quote stack */}
          <div className="relative flex gap-2 md:gap-3 -rotate-2">
            {QUOTES.map((q, i) => (
              <div
                key={q.label}
                className="bg-background border border-border rounded-xl p-3 md:p-4 w-[88px] md:w-[110px] shadow-sm"
                style={{ transform: `translateY(${i * 3}px) rotate(${(i - 1) * 2}deg)` }}
              >
                <p className="text-[8px] md:text-[9px] tracking-wider text-muted-foreground font-semibold">
                  {q.label}
                </p>
                <p className="text-xs md:text-sm font-bold mt-1 text-foreground">{q.amount}</p>
                <div className="mt-2 space-y-1">
                  <div className="h-1 bg-muted rounded w-full" />
                  <div className="h-1 bg-muted rounded w-3/4" />
                  <div className="h-1 bg-muted rounded w-5/6" />
                </div>
              </div>
            ))}
          </div>

          <ArrowRight className="h-6 w-6 text-muted-foreground rotate-90 md:rotate-0" />

          {/* AI node */}
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary/10 border-2 border-primary/40 flex items-center justify-center">
              <Sparkles className="h-8 w-8 md:h-10 md:w-10 text-primary" />
            </div>
            <p className="text-[10px] md:text-xs mt-2 font-bold tracking-widest text-primary">IA</p>
          </div>

          <ArrowRight className="h-6 w-6 text-muted-foreground rotate-90 md:rotate-0" />

          {/* Result */}
          <div className="bg-background border border-primary/30 rounded-xl p-4 md:p-5 shadow-md max-w-[220px]">
            <CheckCircle2 className="h-6 w-6 text-primary mb-2" />
            <p className="text-sm font-semibold text-foreground leading-tight">
              1 recommandation adaptée à votre projet.
            </p>
            <div className="flex gap-0.5 mt-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-3.5 w-3.5 fill-primary text-primary" />
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8 max-w-md mx-auto">
          UNPRO analyse des centaines de critères en quelques secondes.
        </p>
      </div>
    </section>
  );
}
