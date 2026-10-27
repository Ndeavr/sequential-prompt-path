import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, FileText, MapPin, MessageCircle, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import UnproLogo from "@/components/brand/UnproLogo";
import { campaignLink } from "@/lib/contractorCampaignLinks";
import { captureAttribution } from "@/hooks/useReferralAttribution";
import { logFunnelEvent } from "@/lib/analytics/logFunnelEvent";

const CAMPAIGN = "paper_quotes_video";
const obstacles = [
  ["Des déplacements inutiles", "Des clients trop loin ou dans des secteurs où tu ne veux pas travailler."],
  ["Des demandes mal ciblées", "Des services qui ne sont même pas dans tes spécialités."],
  ["Une course aux prix", "La même demande envoyée à plusieurs entrepreneurs. Encore une soumission pour rien."],
];

function PaperScene() {
  return (
    <div className="relative overflow-hidden rounded-[30px] border border-white/15 bg-gradient-to-br from-[#18283d] to-[#060d19] p-6 shadow-[0_35px_100px_rgba(0,0,0,.5)]" role="img" aria-label="Deux soumissions froissées tombées dans la corbeille, une troisième a frappé le rebord et est tombée à côté.">
      <div className="mb-6 flex items-center justify-between text-xs font-semibold uppercase tracking-[.2em] text-sky-200/70"><span>Soumissions perdues</span><span>01 / 02 / 03</span></div>
      <div className="relative h-[280px]">
        <div className="absolute left-0 top-10 w-[45%] rotate-[-8deg] rounded-xl bg-slate-100 p-5 text-slate-600 shadow-2xl">
          <FileText className="h-10 w-10 text-blue-700" aria-hidden="true" />
          <span className="mt-3 block h-2 w-full rounded bg-slate-300" /><span className="mt-2 block h-2 w-4/5 rounded bg-slate-300" />
          <span className="mt-2 block h-2 w-3/5 rounded bg-slate-300" />
        </div>
        <div className="absolute bottom-7 right-10 flex h-36 w-32 items-center justify-center rounded-b-3xl border-x-[9px] border-b-[9px] border-t-[15px] border-slate-400/80 bg-slate-500/15 shadow-[inset_0_0_40px_rgba(30,60,80,.5)]">
          <Trash2 className="h-20 w-20 text-slate-300/25" strokeWidth={1} aria-hidden="true" />
          <span className="absolute -top-10 left-5 h-10 w-11 rotate-12 rounded-[40%] border-2 border-slate-500 bg-slate-200 shadow-lg" />
          <span className="absolute -top-8 right-2 h-9 w-11 -rotate-12 rounded-[35%] border-2 border-slate-500 bg-slate-200 shadow-lg" />
        </div>
        <div className="absolute bottom-0 right-0 h-10 w-12 rotate-[-25deg] rounded-[38%] border-2 border-slate-500 bg-slate-200 shadow-[0_8px_20px_rgba(0,0,0,.45)]" />
        <span className="absolute bottom-1 left-1 text-xs text-slate-400">La troisième... tombe à côté.</span>
      </div>
      <div className="mt-3 border-t border-white/10 pt-5 text-base font-semibold text-white">Et si tes prochains contrats n'étaient plus un jeu de hasard?</div>
    </div>
  );
}

export default function PageContractorPaperQuotesLanding() {
  const { search } = useLocation();
  const audit = campaignLink("/entrepreneurs/audit-ia", search, { source: CAMPAIGN, campaign: CAMPAIGN });
  const activation = campaignLink("/entrepreneurs/activation-350", search, { source: CAMPAIGN, campaign: CAMPAIGN });
  useEffect(() => {
    captureAttribution(new URLSearchParams(search));
    void logFunnelEvent({ event_type: "landing_view", step: CAMPAIGN, metadata: { surface: CAMPAIGN } });
  }, [search]);
  const track = (position: string, destination = "audit") => {
    void logFunnelEvent({ event_type: "cta_click", step: CAMPAIGN, metadata: { surface: CAMPAIGN, position, destination } });
  };
  const primary = "inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-400 to-blue-600 px-6 py-4 text-center text-base font-bold text-white shadow-[0_12px_40px_rgba(37,99,235,.3)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200/50";
  return (
    <main className="alex-immersive min-h-screen bg-[#050816] pb-24 text-white sm:pb-0">
      <Helmet>
        <title>Choisis tes clients. Pas la course aux soumissions | UNPRO</title>
        <meta name="description" content="Tanné des soumissions perdues et des déplacements inutiles? Découvre comment Clara d’UNPRO apprend à connaître les bons contrats pour ton entreprise." />
        <meta name="robots" content="noindex,follow" />
      </Helmet>
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link to="/" aria-label="Accueil UNPRO"><UnproLogo size={145} tone="dark" animated={false} /></Link>
        <span className="text-right text-xs text-slate-300">Pour les entrepreneurs<br />du Québec</span>
      </header>
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-9 sm:px-8 lg:grid-cols-2 lg:pt-16">
        <div>
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-400/25 bg-sky-400/10 px-4 py-2 text-sm font-semibold text-sky-200"><Sparkles className="h-4 w-4" aria-hidden="true" /> T'as choisi d'être entrepreneur.</p>
          <h1 className="text-4xl font-extrabold leading-[1.06] tracking-[-.04em] sm:text-6xl">Pas pour remplir une <span className="bg-gradient-to-r from-sky-200 to-blue-500 bg-clip-text text-transparent">corbeille de soumissions.</span></h1>
          <p className="mt-7 text-lg leading-relaxed text-slate-200">Rencontrer des clients, faire des prix, faire des suivis… pis te battre contre trois ou quatre autres entrepreneurs sur le prix.</p>
          <p className="mt-4 text-xl font-bold">T'as pas parti ton entreprise pour ça.</p>
          <Link data-testid="paper-quotes-hero-cta" to={audit} onClick={() => track("hero")} className={primary + " mt-8 w-full sm:w-auto"}>Voir comment Clara peut m'aider <ArrowRight className="h-5 w-5" aria-hidden="true" /></Link>
          <p className="mt-3 text-sm text-slate-300">Audit IA gratuit · Sans engagement</p>
        </div>
        <PaperScene />
      </section>
      <section className="border-y border-white/10 bg-white/[.03]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
          <p className="text-sm font-semibold uppercase tracking-[.17em] text-sky-300">Ça te ressemble?</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Trop de temps perdu avant même de commencer les travaux.</h2>
          <div className="mt-9 grid gap-4 md:grid-cols-3">{obstacles.map(([title, text], index) => <div key={title} className="rounded-3xl border border-white/10 bg-white/[.04] p-6"><span className="text-sm font-bold text-sky-300">0{index + 1}</span><h3 className="mt-4 text-xl font-bold">{title}</h3><p className="mt-3 leading-relaxed text-slate-300">{text}</p></div>)}</div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <h2 className="max-w-4xl text-3xl font-bold leading-tight sm:text-5xl">Et si c'était <span className="text-sky-300">toi qui choisissais les bons contrats?</span></h2>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-200">Clara apprend tes spécialités, tes secteurs, tes objectifs et les projets que tu veux éviter. UNPRO aide ensuite à rapprocher les besoins des propriétaires des entrepreneurs qui leur correspondent, sans revendre la même demande à plusieurs concurrents.</p>
        <div className="mt-9 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-sky-400/15 p-6"><MapPin className="h-7 w-7 text-sky-300" aria-hidden="true" /><h3 className="mt-4 text-xl font-bold">Ton territoire</h3><p className="mt-2 text-slate-300">Où tu veux travailler… et où tu ne veux plus aller.</p></div>
          <div className="rounded-3xl border border-sky-400/15 p-6"><ShieldCheck className="h-7 w-7 text-sky-300" aria-hidden="true" /><h3 className="mt-4 text-xl font-bold">Tes spécialités</h3><p className="mt-2 text-slate-300">Les services et les projets qui correspondent réellement à ton équipe.</p></div>
          <div className="rounded-3xl border border-sky-400/15 p-6"><MessageCircle className="h-7 w-7 text-sky-300" aria-hidden="true" /><h3 className="mt-4 text-xl font-bold">Tes préférences</h3><p className="mt-2 text-slate-300">Une conversation avec Clara plutôt qu'un long questionnaire.</p></div>
        </div>
      </section>
      <section className="border-t border-white/10 bg-[#0b1627]">
        <div className="mx-auto grid max-w-7xl items-center gap-7 px-5 py-14 sm:px-8 md:grid-cols-[1fr_auto]">
          <div><h2 className="text-3xl font-bold">Choisis tes clients. Pas la course aux soumissions.</h2><p className="mt-4 max-w-2xl leading-relaxed text-slate-200">Commence par l'audit gratuit avec Clara. L'activation UNPRO coûte 350 $ + taxes applicables pour le profil et 12 mois de présence IA. Le volume et le prix des rendez-vous exclusifs, s'il y a lieu, sont présentés séparément avant paiement.</p></div>
          <div className="flex flex-col gap-3"><Link to={audit} onClick={() => track("final")} className={primary}>Discuter avec Clara <ArrowRight className="h-5 w-5" aria-hidden="true" /></Link><Link to={activation} onClick={() => track("final", "activation")} className="min-h-11 p-3 text-center text-sm font-semibold text-sky-200 underline underline-offset-4">Voir l'activation à 350 $ + taxes</Link></div>
        </div>
      </section>
      <footer className="mx-auto max-w-7xl px-5 py-8 text-xs leading-relaxed text-slate-400 sm:px-8">Aucun rendez-vous, contrat signé ou référencement par une IA tierce n'est garanti. Les licences professionnelles requises doivent être valides et vérifiées avant tout jumelage.</footer>
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/15 bg-[#06101d]/95 px-4 pt-3 backdrop-blur sm:hidden" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}><Link to={audit} onClick={() => track("mobile_sticky")} className={primary + " w-full text-sm"}>Voir comment Clara peut m'aider <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div>
    </main>
  );
}
