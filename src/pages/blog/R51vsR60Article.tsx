/**
 * Guide éditorial UNPRO — R-51 ou R-60, isolation d'entretoit au Québec.
 * Static editorial page for /blog/r51-vs-r60-isolation-entretoit-cout-economies
 * No dependence on blog-content generation, Lovable credits, or database writes.
 */
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";

export const R51_R60_ARTICLE_SLUG = "r51-vs-r60-isolation-entretoit-cout-economies";

const FAQS = [
  {
    question: "Est-ce que R-60 réduit ma facture de chauffage de 15 % par rapport à R-51 ?",
    answer: "Non. Les 15 % représentent une réduction théorique du transfert de chaleur à travers l'isolant comparé, et non une économie de 15 % sur toute la facture. Les murs, fenêtres, infiltrations d'air, ventilation et rendement du chauffage restent déterminants.",
  },
  {
    question: "Combien de laine soufflée ajouter avec deux pouces d'uréthane ?",
    answer: "Avec une hypothèse de R-12 pour les deux pouces de mousse à cellules fermées, il faut environ R-39 à R-40 de fibre de verre pour atteindre ou dépasser R-51, et R-48 pour atteindre R-60. Pour AttiCat PINK, la charte de 2024 indique 14,6 pouces à R-40 et 17,4 pouces à R-48. Vérifiez la valeur R certifiée de la mousse et la charte du lot exact.",
  },
  {
    question: "Le pare-vapeur est-il toujours nécessaire sous la laine ?",
    answer: "L'assemblage a besoin d'une stratégie adaptée de contrôle de l'air et de la vapeur. De la mousse polyuréthane à cellules fermées correctement appliquée entre les solives peut jouer plusieurs rôles, mais son épaisseur, sa continuité et le support doivent être vérifiés. Un film de polyéthylène supplémentaire n'est pas automatiquement requis ni souhaitable.",
  },
  {
    question: "Peut-on souffler la laine directement sur l'uréthane ?",
    answer: "Dans un assemblage conçu pour cette méthode, oui : Ressources naturelles Canada décrit l'application de mousse à cellules fermées entre les solives, suivie d'un complément d'isolant. Un entrepreneur qualifié doit vérifier les dégagements, les luminaires, l'humidité et la ventilation.",
  },
  {
    question: "L'uréthane est-il toujours plus rentable que la laine seule ?",
    answer: "Pas nécessairement. L'uréthane est particulièrement intéressant lorsqu'il sert aussi à corriger des fuites d'air ou l'absence de pare-air. Si le plafond est déjà étanche, l'ajout de laine soufflée peut offrir un meilleur retour sur investissement.",
  },
];

const sourceUrls = [
  "https://natural-resources.canada.ca/energy-efficiency/home-energy-efficiency/keeping-heat-section-5-roofs-attics",
  "https://atticat.ca/wp-content/uploads/2024/02/ATTICAT-BROCHURE_EN_2024.pdf",
  "https://www.hydroquebec.com/residential/customer-space/rates/rate-d-billing.html",
];

const money = (n: number) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

export default function R51vsR60Article() {
  const { openAlex } = useAlexVoice();
  const [extraCost, setExtraCost] = useState(600);
  const [annualSaving, setAnnualSaving] = useState(22);
  const payback = extraCost / annualSaving;
  const title = "R-51 ou R-60 pour l'entretoit : combien coûte la différence et combien économise-t-on vraiment ?";
  const description = "Comparaison R-51 vs R-60 au Québec : pouces de fibre de verre soufflée avec 2 po d'uréthane, prix pour 1 400 pi², économies de chauffage et retour sur investissement.";
  const url = "https://unpro.ca/blog/" + R51_R60_ARTICLE_SLUG;
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    inLanguage: "fr-CA",
    datePublished: "2026-10-27",
    dateModified: "2026-10-27",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: { "@type": "Organization", name: "UNPRO" },
    publisher: { "@type": "Organization", name: "UNPRO" },
    citation: sourceUrls,
  };
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <html lang="fr" />
        <title>{title} | UNPRO</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={url} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <article className="mx-auto max-w-3xl px-4 py-10 md:py-14 space-y-9 text-readable-body">
        <nav aria-label="Fil d'Ariane" className="text-sm text-muted-foreground">
          <Link className="hover:text-primary" to="/">Accueil</Link> {" / "}
          <Link className="hover:text-primary" to="/blog">Blog</Link> {" / "} Isolation
        </nav>

        <header className="space-y-5">
          <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-muted-foreground">
            <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-primary">Guide isolation • Québec</span>
            <span>27 octobre 2026</span>
            <span>Lecture : 7 min</span>
          </div>
          <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-4xl">{title}</h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Vous faites retirer tout l'ancien isolant et hésitez entre R-51 et R-60 ? Clara d'UNPRO compare les épaisseurs,
            les coûts supplémentaires et les vraies économies, avec un exemple concret de <strong>1 400 pi²</strong> et
            <strong> 2 pouces d'uréthane à cellules fermées</strong> sous la fibre de verre soufflée.
          </p>
        </header>

        <section className="grid grid-cols-2 gap-3 sm:gap-4" aria-label="Comparaison rapide">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">R-51 → R-60</p>
            <p className="mt-2 text-3xl font-bold text-primary">15 %</p>
            <p className="mt-2 text-sm text-muted-foreground">Moins de pertes par conduction à travers l'isolant, à épaisseur et R théoriques comparés.</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sur 1 400 pi²</p>
            <p className="mt-2 text-3xl font-bold text-primary">≈ 20 $/an</p>
            <p className="mt-2 text-sm text-muted-foreground">Ordre de grandeur des économies de chauffage électrique résistif; pas une garantie.</p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Que signifie vraiment R-51 versus R-60 ?</h2>
          <p>La valeur R mesure la résistance au passage de la chaleur. Plus elle est élevée, moins la chaleur traverse l'assemblage, toutes choses égales par ailleurs. En comparant uniquement les résistances nominales, le flux thermique varie comme 1/R : <strong>1 − (51 ÷ 60) = 15 %</strong> de pertes conductives en moins en passant de R-51 à R-60.</p>
          <p><strong>Attention :</strong> ce n'est pas 15 % sur la facture d'Hydro-Québec. Le chauffage compense aussi les pertes des fenêtres, murs, sous-sol et infiltrations d'air. Les solives créent des ponts thermiques : la performance effective du plafond peut être inférieure à la somme des valeurs R annoncées entre les solives.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Exemple : 1 400 pi², 2 po d'uréthane, puis fibre de verre</h2>
          <p>Voici un exemple de dimensionnement, <strong>en supposant R-12 certifié pour les 2 pouces de mousse</strong>. Le produit choisi peut offrir une autre résistance, et les jonctions avec les solives doivent être évaluées. Nous arrondissons l'option R-51 vers le haut à une couche de fibre R-40, soit environ R-52 dans les zones isolées.</p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[540px] text-left text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="px-4 py-3 font-semibold">Caractéristique</th>
                  <th className="px-4 py-3 font-semibold">Option R-51+</th>
                  <th className="px-4 py-3 font-semibold">Option R-60</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr><th className="px-4 py-3 font-medium">Uréthane à cellules fermées</th><td className="px-4 py-3">2 po (≈ R-12)</td><td className="px-4 py-3">2 po (≈ R-12)</td></tr>
                <tr><th className="px-4 py-3 font-medium">Fibre de verre soufflée AttiCat</th><td className="px-4 py-3">R-40</td><td className="px-4 py-3">R-48</td></tr>
                <tr><th className="px-4 py-3 font-medium">Épaisseur de fibre</th><td className="px-4 py-3">14,6 po</td><td className="px-4 py-3">17,4 po</td></tr>
                <tr><th className="px-4 py-3 font-medium">Sacs de 30 lb, pour 1 400 pi²</th><td className="px-4 py-3">≈ 30 sacs</td><td className="px-4 py-3">≈ 37 sacs</td></tr>
                <tr><th className="px-4 py-3 font-medium">R nominal local</th><td className="px-4 py-3">≈ R-52</td><td className="px-4 py-3">≈ R-60</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground">Source : <a className="underline underline-offset-2" href={sourceUrls[1]} rel="noopener noreferrer" target="_blank">charte canadienne Owens Corning AttiCat, 2024</a> (R-40 : 14,6 po et 29,6 sacs; R-48 : 17,4 po et 36,1 sacs, arrondis au sac entier). L'entrepreneur doit utiliser la charte du produit installé et confirmer le nombre de sacs sur sa soumission.</p>
          <p><strong>Différence pratique :</strong> environ <strong>2,8 pouces de laine et 7 sacs supplémentaires</strong> dans cet exemple. Le résultat réel dépend de la valeur R vieillie de la mousse et de la continuité de l'isolant.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Combien coûte le passage de R-51 à R-60 ?</h2>
          <p>L'uréthane, le retrait de l'ancien isolant, le nettoyage, le calfeutrage et les déflecteurs de ventilation coûtent sensiblement la même chose dans les deux scénarios. La différence vient surtout de la quantité supplémentaire de fibre soufflée.</p>
          <p>Pour un projet comparable de <strong>1 400 pi²</strong>, utilisez un <strong>budget indicatif d'environ 400 à 800 $ de plus</strong> pour le R-60. Ce n'est pas un tarif contractuel : le prix dépend du fournisseur, de la main-d'œuvre et du devis. Demandez au professionnel de chiffrer <em>uniquement la différence R-51/R-60</em> sur la même soumission.</p>
          <p>Ne comparez pas une offre R-51 qui comprend le retrait, le pare-air et les correctifs de ventilation avec une offre R-60 qui les exclut. Le prix total n'est pas comparable si les travaux ne sont pas identiques.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Économies d'énergie : combien de dollars par année ?</h2>
          <p>Pour un grenier de 1 400 pi², dans un climat comparable au Grand Montréal (environ 4 200 à 4 300 degrés-jours de chauffage par année), un calcul théorique de conduction entre R-51 et R-60 donne environ <strong>200 à 230 kWh de chaleur économisés par an</strong>. Le climat, les températures réelles et les ponts thermiques peuvent changer sensiblement ce résultat.</p>
          <p>Avec un chauffage électrique à résistance, cela représente approximativement <strong>15 à 26 $/an</strong> aux tarifs D d'Hydro-Québec en vigueur le 1er avril 2026, selon la tranche de consommation. Avec une thermopompe, l'électricité économisée sera généralement moindre. Ce calcul n'inclut ni variation future du tarif, ni économies d'été, ni modifications de l'étanchéité à l'air.</p>
          <p>Le passage de R-10 ou R-20 à R-51 peut produire des économies nettement plus importantes. L'écart <strong>entre deux plafonds déjà très bien isolés</strong>, R-51 et R-60, est beaucoup plus modeste.</p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-5">
          <h2 className="text-xl font-bold">Calculateur : est-ce que le R-60 se rembourse ?</h2>
          <p className="text-sm text-muted-foreground">Ajustez le coût supplémentaire inscrit dans votre soumission et les économies annuelles supposées. Calcul de retour simple, sans actualisation ni hausse future des tarifs.</p>
          <div className="space-y-2">
            <label htmlFor="r60-surcout" className="flex justify-between gap-2 text-sm font-medium"><span>Supplément demandé pour R-60</span><strong>{money(extraCost)}</strong></label>
            <input id="r60-surcout" className="w-full accent-primary" type="range" min="200" max="1500" step="50" value={extraCost} onChange={(e) => setExtraCost(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <label htmlFor="r60-economies" className="flex justify-between gap-2 text-sm font-medium"><span>Économies annuelles estimées</span><strong>{money(annualSaving)}/an</strong></label>
            <input id="r60-economies" className="w-full accent-primary" type="range" min="5" max="50" step="1" value={annualSaving} onChange={(e) => setAnnualSaving(Number(e.target.value))} />
          </div>
          <div className="border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">Délai de remboursement simple</p>
            <p className="text-3xl font-bold text-primary">{payback.toLocaleString("fr-CA", { maximumFractionDigits: 1 })} ans</p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">L'étanchéité à l'air et la ventilation passent avant les derniers points R</h2>
          <p>Si l'ancien isolant est entièrement retiré, c'est le meilleur moment pour inspecter le plafond, sceller les pénétrations, vérifier les dégagements autour des sources de chaleur et contrôler l'humidité. Ressources naturelles Canada décrit l'application d'une mousse polyuréthane à cellules fermées <strong>entre les solives</strong>, suivie d'un isolant complémentaire, comme une option lorsque les conditions de l'assemblage s'y prêtent.</p>
          <p>Il faut aussi conserver les entrées d'air de soffite dégagées, poser des déflecteurs adaptés et traiter correctement la trappe d'accès. Une peinture acrylique ordinaire n'est <strong>pas</strong> un pare-vapeur de remplacement. Le film de polyéthylène ne s'ajoute pas automatiquement par-dessus l'uréthane : une mauvaise disposition peut limiter le séchage de matériaux sensibles.</p>
          <p>En cas de vermiculite possiblement contaminée, ne la dérangez pas avant l'évaluation et la procédure adéquates.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Le conseil de Clara</h2>
          <p><strong>Choisissez R-51+</strong> si votre budget est serré et que le contrat prévoit déjà une excellente étanchéité, la correction des problèmes d'humidité et une ventilation fonctionnelle. <strong>Choisissez R-60</strong> si le supplément est modeste, si vous gardez la maison longtemps ou si vous privilégiez une marge thermique supplémentaire.</p>
          <p>Avant d'approuver la soumission, demandez le nom exact des produits, l'épaisseur et la valeur R certifiées de l'uréthane, la profondeur de laine visée, le nombre de sacs, les travaux de ventilation, les exclusions et les photos avant/après.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Questions fréquentes</h2>
          {FAQS.map((faq) => (
            <details key={faq.question} className="group rounded-xl border border-border bg-card px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold">{faq.question}</summary>
              <p className="pt-3 text-sm text-muted-foreground">{faq.answer}</p>
            </details>
          ))}
        </section>

        <section className="space-y-2 text-sm text-muted-foreground">
          <h2 className="text-lg font-bold text-foreground">Sources et méthode</h2>
          <p><a href={sourceUrls[0]} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Ressources naturelles Canada — Emprisonnons la chaleur, toits et entretoits</a></p>
          <p><a href={sourceUrls[1]} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Owens Corning AttiCat — tableau de couverture canadien</a></p>
          <p><a href={sourceUrls[2]} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Hydro-Québec — tarif D au 1er avril 2026</a></p>
          <p>Méthode : estimation stationnaire des pertes par conduction, 1 400 pi², deux valeurs R nominales, environ 4 250 degrés-jours à 18 °C. Ne constitue pas une simulation énergétique ni une soumission.</p>
        </section>

        <aside className="rounded-2xl border border-primary/25 bg-primary/5 p-6 text-center space-y-4">
          <h2 className="text-2xl font-bold">Votre entrepreneur propose R-51 ou R-60 ?</h2>
          <p className="text-sm text-muted-foreground">Demandez à Clara d'analyser les détails de votre entretoit et votre soumission, puis de vous orienter vers un professionnel adapté à votre projet.</p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <button type="button" onClick={() => openAlex("general")} className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Parler à Clara</button>
            <Link to="/decrire-mon-projet" className="rounded-xl border border-border px-6 py-3 text-sm font-semibold hover:bg-muted">Décrire mon projet</Link>
          </div>
        </aside>
      </article>
    </div>
  );
}
