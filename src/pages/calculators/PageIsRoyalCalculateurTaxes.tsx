/**
 * UNPRO × Isolation Solution Royal — Calculateur de taxes (variante de marque)
 * Réutilise TaxCalculatorQuebec avec habillage et copy isolation.
 */
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Snowflake, ShieldCheck, Phone } from "lucide-react";
import SeoHead from "@/seo/components/SeoHead";
import SeoFaqSection from "@/seo/components/SeoFaqSection";
import { injectJsonLd } from "@/lib/seoSchema";
import TaxCalculatorQuebec from "@/components/calculators/TaxCalculatorQuebec";

const FAQS = ([
  {
    question: "Les travaux d'isolation sont-ils taxables au Québec?",
    answer:
      "Oui. Les services d'isolation résidentielle (uréthane giclé, cellulose, fibre de verre) sont taxables : TPS 5 % + TVQ 9,975 %, soit 14,975 % au total.",
  },
  {
    question: "Comment calculer le coût total d'un projet d'isolation?",
    answer:
      "Additionnez le sous-total avant taxes (matériaux + main-d'œuvre), puis multipliez par 1,14975 pour obtenir le total final taxes incluses.",
  },
  {
    question: "Existe-t-il des subventions ou crédits pour l'isolation?",
    answer:
      "Oui. Plusieurs programmes (Rénoclimat, LogisVert, crédits municipaux) peuvent réduire la facture après taxes. Demandez à Isolation Solution Royal le programme adapté à votre projet.",
  },
  {
    question: "Quel est le total taxes incluses pour 5 000 $ de travaux?",
    answer: "Pour 5 000 $ avant taxes : TPS 250,00 $, TVQ 498,75 $, total 5 748,75 $.",
  },
  {
    question: "Comment obtenir une soumission précise pour mon isolation?",
    answer:
      "Contactez Isolation Solution Royal pour une évaluation sur place. Vous recevrez un prix détaillé avec ventilation TPS/TVQ.",
  },
] as const).map((f) => ({ ...f, topics: [] as string[] }));

export default function PageIsRoyalCalculateurTaxes() {
  useEffect(() => {
    const cleanups = [
      injectJsonLd({
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "Calculateur de taxes — Isolation Solution Royal",
        url: "https://unpro.ca/isroyal/calculateur-taxes",
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        inLanguage: "fr-CA",
        offers: { "@type": "Offer", price: "0", priceCurrency: "CAD" },
        provider: {
          "@type": "Organization",
          name: "Isolation Solution Royal",
          url: "https://isroyal.ca",
        },
      }),
    ];
    return () => cleanups.forEach((fn) => fn());
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      <SeoHead
        title="Calculateur taxes isolation Québec | Isolation Solution Royal"
        description="Calculez la TPS et la TVQ sur vos travaux d'isolation au Québec. Estimation rapide pour soumission, facture et budget projet — Isolation Solution Royal."
        canonical="https://unpro.ca/isroyal/calculateur-taxes"
      />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.15),transparent_60%)]" />
        <div className="max-w-3xl mx-auto px-5 pt-10 pb-8 sm:pt-16 sm:pb-12">
          <div className="text-center space-y-4 mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-xs text-primary font-medium">
              <Snowflake className="h-3.5 w-3.5" />
              Isolation Solution Royal — Outil gratuit
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground font-display">
              Calculateur de taxes — Isolation au Québec
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Estimez instantanément la TPS et la TVQ sur vos travaux d'isolation. Idéal pour valider une soumission ou
              prévoir le coût réel d'un projet d'uréthane, de cellulose ou de fibre de verre.
            </p>
          </div>

          <TaxCalculatorQuebec />
        </div>
      </section>

      {/* Trust + ISR CTA */}
      <section className="max-w-3xl mx-auto px-5 pb-8">
        <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">Une soumission précise pour votre isolation</h2>
              <p className="text-muted-foreground mt-1">
                Isolation Solution Royal évalue votre projet sur place et vous remet un prix détaillé, taxes incluses,
                avec recommandations adaptées à votre maison.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <a
                  href="https://isroyal.ca"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition"
                >
                  Visiter isroyal.ca <ArrowRight className="h-4 w-4" />
                </a>
                <Link
                  to="/parler-a-alex"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-border bg-card hover:bg-muted/40 transition font-semibold"
                >
                  <Phone className="h-4 w-4" /> Parler à Alex
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEO content */}
      <article className="max-w-3xl mx-auto px-5 py-12 space-y-10">
        <Section title="Pourquoi calculer les taxes sur vos travaux d'isolation?">
          <p>
            Une bonne isolation représente un investissement important. Connaître exactement la portion taxes (TPS 5 % +
            TVQ 9,975 %) permet de comparer correctement les soumissions, valider une facture et éviter toute mauvaise
            surprise au moment du paiement.
          </p>
        </Section>

        <Section title="Exemples rapides — projets d'isolation typiques">
          <div className="grid sm:grid-cols-2 gap-3 mt-2">
            {[
              { l: "Entretoit — 2 500 $", v: "2 874,38 $" },
              { l: "Sous-sol — 5 000 $", v: "5 748,75 $" },
              { l: "Maison complète — 12 000 $", v: "13 797,00 $" },
              { l: "Uréthane commercial — 25 000 $", v: "28 743,75 $" },
            ].map((c) => (
              <div key={c.l} className="rounded-xl border border-border/50 p-4 bg-card/40">
                <div className="text-xs text-muted-foreground">{c.l}</div>
                <div className="font-bold tabular-nums text-lg">Total : {c.v}</div>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            Calculs basés sur le taux combiné de 14,975 % (TPS + TVQ).
          </p>
        </Section>

        <Section title="Comment fonctionne le calcul">
          <pre className="p-4 rounded-xl bg-muted/40 text-sm overflow-x-auto">
{`Avant taxes  → Total = montant × 1,14975
Taxes incl.  → Sous-total = total / 1,14975
TPS = sous-total × 0,05
TVQ = sous-total × 0,09975`}
          </pre>
        </Section>

        <SeoFaqSection faqs={FAQS} />

        <nav aria-label="Liens utiles" className="rounded-2xl border border-border/50 p-5 bg-card/40">
          <h2 className="text-lg font-bold mb-3">Continuer</h2>
          <ul className="grid sm:grid-cols-2 gap-2 text-sm">
            <LinkRow to="/calculateur-taxes-quebec" label="Calculateur taxes Québec (général)" />
            <LinkRow to="/parler-a-alex" label="Parler à Alex" />
            <LinkRow to="/soumission-travaux" label="Demander une soumission" />
            <LinkRow to="/verification-entrepreneur" label="Vérifier la licence RBQ" />
          </ul>
        </nav>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xl sm:text-2xl font-bold text-foreground">{title}</h2>
      <div className="text-foreground/80 leading-relaxed">{children}</div>
    </section>
  );
}

function LinkRow({ to, label }: { to: string; label: string }) {
  return (
    <li>
      <Link
        to={to}
        className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/40 border border-border/30 transition"
      >
        <span>{label}</span>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </Link>
    </li>
  );
}
