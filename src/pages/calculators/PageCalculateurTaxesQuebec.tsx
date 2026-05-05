/**
 * UNPRO — /calculateur-taxes-quebec
 * Premium SEO/AEO landing with TPS/TVQ calculator + JSON-LD.
 */
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calculator } from "lucide-react";
import SeoHead from "@/seo/components/SeoHead";
import SeoFaqSection from "@/seo/components/SeoFaqSection";
import { injectJsonLd } from "@/lib/seoSchema";
import TaxCalculatorQuebec from "@/components/calculators/TaxCalculatorQuebec";

const FAQS: { question: string; answer: string; topics: string[] }[] = ([
  {
    question: "Quel est le taux de taxes au Québec?",
    answer: "Au Québec, la TPS (taxe fédérale) est de 5 % et la TVQ (taxe provinciale) est de 9,975 %. Le taux combiné est de 14,975 %.",
  },
  {
    question: "Comment calculer la TPS et la TVQ?",
    answer: "Multipliez le montant avant taxes par 0,05 pour la TPS et par 0,09975 pour la TVQ. Additionnez les deux au montant initial pour obtenir le total.",
  },
  {
    question: "La TVQ est-elle calculée sur la TPS?",
    answer: "Non. Depuis 2013, la TVQ est calculée uniquement sur le prix de vente avant taxes, et non sur la TPS.",
  },
  {
    question: "Comment enlever les taxes d'un montant taxes incluses?",
    answer: "Divisez le montant total par 1,14975 pour obtenir le sous-total avant taxes. Multipliez ensuite ce sous-total par 0,05 (TPS) et 0,09975 (TVQ).",
  },
  {
    question: "Quel est le total avec taxes pour 100 $ au Québec?",
    answer: "Pour 100 $ avant taxes : TPS de 5,00 $, TVQ de 9,98 $, pour un total de 114,98 $.",
  },
  {
    question: "Est-ce que tous les services résidentiels sont taxables?",
    answer: "La majorité des services de rénovation, réparation et entretien résidentiel sont taxables (TPS + TVQ). Certaines exceptions existent pour les constructions neuves admissibles à un remboursement.",
  },
  {
    question: "Est-ce qu'UNPRO peut m'aider à comparer une soumission?",
    answer: "Oui. Alex, l'assistante UNPRO, peut analyser vos soumissions, vérifier le calcul des taxes, repérer les anomalies et vous recommander un entrepreneur compatible.",
  },
] as const).map((f) => ({ ...f, topics: [] as string[] }));

export default function PageCalculateurTaxesQuebec() {
  useEffect(() => {
    const cleanups = [
      injectJsonLd({
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "Calculateur de taxes Québec TPS/TVQ — UNPRO",
        url: "https://unpro.ca/calculateur-taxes-quebec",
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        inLanguage: "fr-CA",
        offers: { "@type": "Offer", price: "0", priceCurrency: "CAD" },
        description:
          "Calculateur gratuit de TPS (5 %) et TVQ (9,975 %) au Québec. Calcul direct ou inverse pour factures, soumissions et travaux résidentiels.",
      }),
    ];
    return () => cleanups.forEach((fn) => fn());
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      <SeoHead
        title="Calculateur taxes Québec TPS TVQ | UNPRO"
        description="Calculez la TPS et la TVQ au Québec avec un montant avant taxes ou taxes incluses. Calculateur rapide pour factures, soumissions et travaux résidentiels."
        canonical="https://unpro.ca/calculateur-taxes-quebec"
      />

      {/* Hero + Calculator */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.15),transparent_60%)]" />
        <div className="max-w-3xl mx-auto px-5 pt-10 pb-8 sm:pt-16 sm:pb-12">
          <div className="text-center space-y-4 mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-xs text-primary font-medium">
              <Calculator className="h-3.5 w-3.5" /> Outil gratuit UNPRO
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground font-display">
              Calculateur de taxes Québec TPS/TVQ
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Calculez rapidement la TPS et la TVQ au Québec, que votre montant soit avant taxes ou taxes incluses.
              Idéal pour estimer une facture, comparer une soumission ou prévoir le coût réel de travaux résidentiels.
            </p>
          </div>

          <TaxCalculatorQuebec />
        </div>
      </section>

      {/* SEO Content */}
      <article className="max-w-3xl mx-auto px-5 py-12 space-y-10">
        <Section title="Comment calculer les taxes au Québec?">
          <p>
            Au Québec, deux taxes s'appliquent sur la majorité des biens et services : la <strong>TPS</strong> (taxe sur les
            produits et services, fédérale) et la <strong>TVQ</strong> (taxe de vente du Québec, provinciale). Pour calculer le
            total à payer, ajoutez ces deux taxes au montant avant taxes.
          </p>
        </Section>

        <Section title="Taux de TPS et TVQ au Québec">
          <ul className="space-y-2">
            <li>• <strong>TPS</strong> : 5 % (Agence du revenu du Canada)</li>
            <li>• <strong>TVQ</strong> : 9,975 % (Revenu Québec)</li>
            <li>• <strong>Taux combiné</strong> : 14,975 %</li>
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">
            Depuis 2013, la TVQ est calculée sur le prix avant taxes, et non sur la TPS.
          </p>
        </Section>

        <Section title="Calcul à partir d'un montant avant taxes">
          <p>Multipliez le montant par chaque taux :</p>
          <pre className="mt-3 p-4 rounded-xl bg-muted/40 text-sm overflow-x-auto">
{`TPS = montant × 0,05
TVQ = montant × 0,09975
Total = montant + TPS + TVQ`}
          </pre>
        </Section>

        <Section title="Calcul inverse à partir d'un montant taxes incluses">
          <p>Divisez le total par 1,14975 pour obtenir le sous-total :</p>
          <pre className="mt-3 p-4 rounded-xl bg-muted/40 text-sm overflow-x-auto">
{`Sous-total = total / 1,14975
TPS = sous-total × 0,05
TVQ = sous-total × 0,09975`}
          </pre>
        </Section>

        <Section title="Exemple rapide : 100 $ avant taxes">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
            {[
              { l: "Sous-total", v: "100,00 $" },
              { l: "TPS (5 %)", v: "5,00 $" },
              { l: "TVQ (9,975 %)", v: "9,98 $" },
              { l: "Total", v: "114,98 $" },
            ].map((c) => (
              <div key={c.l} className="rounded-xl border border-border/50 p-3 bg-card/40">
                <div className="text-xs text-muted-foreground">{c.l}</div>
                <div className="font-bold tabular-nums">{c.v}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Pourquoi UNPRO ajoute ce calculateur?">
          <p>
            UNPRO aide les propriétaires québécois à comprendre le vrai coût de leurs travaux. Un calcul de taxes précis
            permet de comparer correctement les soumissions, valider une facture et éviter les mauvaises surprises. Notre
            assistante <strong>Alex</strong> peut aller plus loin : analyser une soumission, valider les prix au marché et vous
            recommander un entrepreneur compatible.
          </p>
        </Section>

        <SeoFaqSection faqs={FAQS} />

        {/* Internal links */}
        <nav aria-label="Liens utiles" className="rounded-2xl border border-border/50 p-5 bg-card/40">
          <h2 className="text-lg font-bold mb-3">Continuer avec UNPRO</h2>
          <ul className="grid sm:grid-cols-2 gap-2 text-sm">
            <LinkRow to="/parler-a-alex" label="Parler à Alex" />
            <LinkRow to="/soumission-travaux" label="Demander une soumission" />
            <LinkRow to="/entrepreneurs" label="Trouver un entrepreneur" />
            <LinkRow to="/verification-entrepreneur" label="Vérifier un entrepreneur (RBQ)" />
          </ul>
        </nav>

        {/* Final CTA */}
        <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 sm:p-8 text-center space-y-3">
          <h3 className="text-xl sm:text-2xl font-bold">Besoin d'un prix pour vos travaux?</h3>
          <p className="text-muted-foreground">
            Alex évalue votre projet, calcule les taxes et vous met en lien avec le bon entrepreneur.
          </p>
          <Link
            to="/parler-a-alex"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition"
          >
            Parler à Alex <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
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
      <Link to={to} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/40 border border-border/30 transition">
        <span>{label}</span>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </Link>
    </li>
  );
}
