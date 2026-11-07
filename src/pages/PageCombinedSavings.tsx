import { Helmet } from 'react-helmet-async';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import UnproLogo from '@/components/brand/UnproLogo';
import { useLanguage } from '@/components/ui/LanguageToggle';
import { CAMPAIGN_COPY, CAMPAIGN_PATHS, calculateCombinedSavings } from '@/data/combinedSavingsCampaign';
import campaignPhoto from '@/assets/carousel-renovation.jpg';

type Props = { kind?: 'vision' | 'article' | 'press' };
export default function PageCombinedSavings({ kind = 'vision' }: Props) {
  const location = useLocation();
  const lang = location.pathname.startsWith('/en/') ? 'en' : 'fr';
  const { setLang } = useLanguage();
  const copy = CAMPAIGN_COPY[lang];
  const paths = CAMPAIGN_PATHS[lang];
  const other = CAMPAIGN_PATHS[lang === 'fr' ? 'en' : 'fr'];
  const url = `https://unpro.ca${paths[kind]}`;
  const title = kind === 'vision' ? copy.headline : kind === 'article' ? copy.articleTitle : copy.pressTitle;
  const totals = calculateCombinedSavings();
  const money = (n: number) => new Intl.NumberFormat(lang === 'fr' ? 'fr-CA' : 'en-CA', { maximumFractionDigits: 0 }).format(n);
  const frCreative = lang === 'fr' && kind === 'vision';
  const creativePath = '/campaigns/unpro-100m-proprietaires.webp';
  const sectionClass = 'border-t border-border py-10 md:py-14 space-y-5';
  return <div className="landing-warm min-h-screen bg-background text-foreground" lang={lang === 'fr' ? 'fr-CA' : 'en-CA'}>
    <Helmet>
      <title>{`${title} | UNPRO`}</title>
      <meta name="description" content={copy.intro} />
      <meta name="robots" content="index,follow" />
      <link rel="canonical" href={url} />
      <link rel="alternate" hrefLang="fr-CA" href={`https://unpro.ca${CAMPAIGN_PATHS.fr[kind]}`} />
      <link rel="alternate" hrefLang="en-CA" href={`https://unpro.ca${CAMPAIGN_PATHS.en[kind]}`} />
      <meta property="og:title" content={`${title} | UNPRO`} />
      <meta property="og:description" content={copy.intro} />
      <meta property="og:type" content={kind === 'vision' ? 'website' : 'article'} />
      <meta property="og:url" content={url} />
      <meta property="og:locale" content={lang === 'fr' ? 'fr_CA' : 'en_CA'} />
      {frCreative && <meta property="og:image" content={`https://unpro.ca${creativePath}`} />}
      {frCreative && <meta property="og:image:width" content="1122" />}
      {frCreative && <meta property="og:image:height" content="1402" />}
      {frCreative && <meta property="og:image:alt" content="UNPRO — 100 millions $ — Et si on économisait ensemble?" />}
      {frCreative && <meta name="twitter:image" content={`https://unpro.ca${creativePath}`} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={`${title} | UNPRO`} />
      <meta name="twitter:description" content={copy.intro} />
      <script type="application/ld+json">{JSON.stringify({ '@context': 'https://schema.org', '@type': kind === 'press' ? 'NewsArticle' : kind === 'article' ? 'Article' : 'WebPage', headline: title, description: copy.intro, url, inLanguage: lang === 'fr' ? 'fr-CA' : 'en-CA', ...(kind === 'press' ? { datePublished: '2026-03-30', dateModified: '2026-11-05' } : kind === 'article' ? { datePublished: '2026-11-05' } : {}), publisher: { '@type': 'Organization', name: 'UNPRO', url: 'https://unpro.ca' } })}</script>
    </Helmet>
    <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-6">
      <Link to="/" aria-label="UNPRO"><UnproLogo size={145} tone="light" /></Link>
      <Button asChild variant="ghost"><Link to={other[kind]}>{lang === 'fr' ? 'English' : 'Français'}</Link></Button>
    </header>
    <main>
      <div className="mx-auto max-w-6xl px-5 pt-9 pb-10 md:pt-14">
        {kind !== 'vision' && <Button asChild variant="ghost" className="mb-5"><Link to={paths.vision}><ArrowLeft className="mr-2 h-4 w-4" />{copy.explanation}</Link></Button>}
        <p className="mb-5 text-sm font-semibold uppercase text-primary">{kind === 'vision' ? 'UNPRO · 2027–2036' : kind === 'press' ? copy.pressLabel : lang === 'fr' ? 'Rapport d’intelligence résidentielle' : 'Housing intelligence report'}</p>
        <h1 className="max-w-4xl text-4xl font-semibold leading-tight tracking-normal md:text-6xl">{title}</h1>
        <p className="mt-7 max-w-3xl text-lg leading-relaxed md:text-xl">{copy.intro}</p>
        <p className="mt-5 max-w-3xl text-sm leading-relaxed text-muted-foreground">{copy.disclaimer}</p>
        {kind === 'press' && <p className="mt-4 text-sm text-muted-foreground">{lang === 'fr' ? 'Montréal · Publié le 30 mars 2026 · Révisé le 5 novembre 2026' : 'Montréal · Published March 30, 2026 · Revised November 5, 2026'}</p>}
        <nav aria-label={lang === 'fr' ? 'Campagne' : 'Campaign'} className="mt-7 flex flex-wrap gap-3">
          <Button asChild><a href="#modele">{copy.explanation}<ArrowRight className="ml-2 h-4 w-4" /></a></Button>
          <Button variant="outline" asChild><Link to={paths.article}>{copy.articleLabel}</Link></Button>
          <Button variant="ghost" asChild><Link to={paths.press}>{copy.pressLabel}</Link></Button>
        </nav>
      </div>
      {frCreative ? <div className="mx-auto grid max-w-5xl gap-6 px-5 md:grid-cols-2">
        {[
          { path: '/campaigns/unpro-100m-entrepreneurs.webp', destination: '/entrepreneurs', action: 'Entrepreneurs : découvrir les mandats faits pour moi', alt: 'UNPRO — Objectif 100 millions $ d’économies partagées. Moins de soumissions pour rien. Plus de mandats faits pour toi.' },
          { path: creativePath, destination: '/?intent=economies-100m', action: 'Propriétaires : parler de mon projet à Clara', alt: 'UNPRO — Objectif 100 millions $ d’économies partagées. Ton projet. Le bon pro. Sans courir après trois soumissions.' },
        ].map(({ path, destination, action, alt }) => <figure key={path}>
          <Link to={destination} onClick={() => setLang(lang)} aria-label={action} className="block rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
            <img src={path} width={1122} height={1402} alt={alt} className="h-auto w-full rounded-xl" />
          </Link>
          <figcaption className="mt-3"><Button asChild className="h-auto min-h-11 w-full whitespace-normal text-center"><Link to={destination} onClick={() => setLang(lang)}>{action}<ArrowRight className="ml-2 h-4 w-4 shrink-0" /></Link></Button></figcaption>
        </figure>)}
      </div> : <figure className="mx-auto max-w-6xl px-5"><img src={campaignPhoto} alt={lang === 'fr' ? 'Travaux de rénovation résidentielle' : 'Residential renovation work'} className="aspect-[3/1] min-h-44 w-full object-cover" /></figure>}
      <div className="mx-auto max-w-6xl px-5">
        <section className={`${sectionClass} mt-10 grid gap-10 md:grid-cols-2`} aria-label={lang === 'fr' ? 'Deux bénéficiaires' : 'Two beneficiaries'}>
          <div className="space-y-4"><p className="text-5xl font-semibold text-primary">60 M$</p><h2 className="text-2xl font-semibold">{copy.entrepreneurTitle}</h2><p className="leading-relaxed">{copy.entrepreneurBody}</p><Button asChild><Link to="/entrepreneur/plan-personnalise?from=vision" onClick={() => setLang(lang)}>{copy.entrepreneurCta}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div>
          <div className="space-y-4"><p className="text-5xl font-semibold text-success">40 M$</p><h2 className="text-2xl font-semibold">{copy.homeownerTitle}</h2><p className="leading-relaxed">{copy.homeownerBody}</p><Button variant="outline" asChild><Link to="/?intent=economies-100m" onClick={() => setLang(lang)}>{copy.homeownerCta}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div>
        </section>
        <section id="modele" className={`${sectionClass} scroll-mt-5`}>
          <h2 className="text-3xl font-semibold">{copy.methodTitle}</h2>
          <div role="img" aria-label={copy.transfer} className="flex h-10 w-full overflow-hidden"><div className="flex w-3/5 items-center justify-center bg-primary text-primary-foreground font-semibold">60 %</div><div className="flex w-2/5 items-center justify-center bg-success text-success-foreground font-semibold">40 %</div></div>
          <p className="text-lg font-semibold leading-relaxed">{copy.formula}</p>
          <p className="leading-relaxed">{copy.participation}</p><p className="leading-relaxed">{copy.net}</p><p className="leading-relaxed">{copy.transfer}</p>
          <output className="block text-sm text-muted-foreground" aria-label={lang === 'fr' ? 'Total du scénario' : 'Scenario total'}>{lang === 'fr' ? 'Total combiné' : 'Combined total'} : {money(totals.generated)} CAD</output>
        </section>
        <section className={sectionClass}><h2 className="text-2xl font-semibold">{copy.cashTitle}</h2><p className="max-w-4xl leading-relaxed">{copy.cash}</p></section>
        <section className={sectionClass}><h2 className="text-2xl font-semibold">{copy.capabilityTitle}</h2><p className="max-w-4xl leading-relaxed">{copy.capability}</p></section>
        <section className={sectionClass}><h2 className="text-2xl font-semibold">{copy.approach}</h2><p className="max-w-4xl leading-relaxed">{copy.measurement}</p></section>
        <section className={sectionClass}><h2 className="text-2xl font-semibold">{copy.riskTitle}</h2><p className="max-w-4xl leading-relaxed">{copy.risk}</p></section>
        <section className={sectionClass}><h2 className="text-2xl font-semibold">{copy.faqTitle}</h2>{copy.faqs.map(([q, a]) => <details key={q} className="border-b border-border py-4"><summary className="cursor-pointer text-lg font-semibold">{q}</summary><p className="mt-4 max-w-4xl leading-relaxed">{a}</p></details>)}</section>
      </div>
    </main>
    <footer className="mx-auto flex max-w-6xl flex-wrap gap-6 border-t border-border px-5 py-8 text-sm"><Link to={paths.vision}>{copy.explanation} · UNPRO</Link><Link to={paths.article}>{copy.articleLabel}</Link><Link to={paths.press}>{copy.pressLabel}</Link><Link to="/impact">{lang === 'fr' ? 'Autres scénarios d’impact' : 'Other impact scenarios'}</Link></footer>
  </div>;
}