/**
 * HomeLightSections — Homeowner-first light sections for the UNPRO homepage.
 * Spacious premium layout, navy text, royal-blue actions, no fabricated data.
 * Every claim is either a product behaviour or an explicit provenance label.
 */
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Camera,
  ClipboardList,
  Crown,
  Home,
  MessageSquare,
  Search,
  Wrench,
} from "lucide-react";

import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { useAlexStore } from "@/features/alex/state/alexStore";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/ui/LanguageToggle";
import { trackCopilotEvent } from "@/utils/trackCopilotEvent";

/** Active homepage paths; existing qualification and Clara remain authoritative. */
export function SectionMatchingPaths({ onStartHomeowner }: { onStartHomeowner: () => void }) {
  const { lang } = useLanguage();
  const reduced = useReducedMotion();
  const fr = lang === "fr";
  const copy = fr ? {
    lines: ["UNPRO.", "Moins de leads.", "De meilleurs matchs.", "De vrais rendez-vous."],
    intro: "Les clics, c'est beau. Les bons clients, c'est mieux.",
    explanation: "UNPRO utilise l'intelligence artificielle pour connecter les bons entrepreneurs aux bons propriétaires.",
    exclusive: "Pas cinq compétiteurs sur le même lead. Pas cinq soumissions à comparer.",
    match: "Le bon match. Du premier coup.",
    contractor: "Vous êtes entrepreneur?",
    contractorPromise: "Arrêtez de courir après les clients. Rencontrez ceux qui vous cherchent.",
    contractorBody: "Soyez mieux positionné pour être découvert par ChatGPT et les autres IA. Et surtout, rencontrez des propriétaires réellement intéressés par VOS services, dans VOTRE territoire.",
    contractorCta: "Faire connaître mon entreprise",
    contractorMicro: "Vos services. Votre territoire. Vos clients. Aucun lead partagé.",
    disclaimer: "Les plateformes d’IA restent libres de leurs recommandations; UNPRO ne garantit pas leur sélection.",
    homeowner: "Vous êtes propriétaire?",
    homeownerPromise: "Pourquoi courir après cinq entrepreneurs quand l'IA peut vous aider à trouver le bon?",
    homeownerBody: "Décrivez votre projet à Clara. UNPRO tient compte du projet, des compétences, des disponibilités et des facteurs humains.",
    homeownerCta: "Trouver mon entrepreneur",
    homeownerMicro: "Gratuit pour les propriétaires. Sans obligation. Sans cinq soumissions à gérer.",
    difference: "Un bon entrepreneur pour le mauvais client, ça reste un mauvais match.",
    closing: "UNPRO — Ce n'est pas une question de trouver plus. C'est une question de trouver mieux.",
    impact: "Découvrir l’impact potentiel de l’IA",
  } : {
    lines: ["UNPRO.", "Fewer leads.", "Better matches.", "Real appointments."],
    intro: "Clicks are nice. The right clients are better.",
    explanation: "UNPRO uses artificial intelligence to connect the right contractors with the right homeowners.",
    exclusive: "Not five competitors on the same lead. Not five quotes to compare.",
    match: "The right match. The first time.",
    contractor: "Are you a contractor?",
    contractorPromise: "Stop chasing clients. Meet the people looking for you.",
    contractorBody: "Help ChatGPT and other AI platforms discover your business. More importantly, meet homeowners genuinely interested in YOUR services, in YOUR service area.",
    contractorCta: "Get my business discovered",
    contractorMicro: "Your services. Your territory. Your clients. No shared leads.",
    disclaimer: "AI platforms make their own recommendations; UNPRO does not guarantee selection.",
    homeowner: "Are you a homeowner?",
    homeownerPromise: "Why chase five contractors when AI can help you find the right one?",
    homeownerBody: "Describe your project to Clara. UNPRO takes the project, skills, availability and human factors into account.",
    homeownerCta: "Find my contractor",
    homeownerMicro: "Free for homeowners. No obligation. No five quotes to manage.",
    difference: "A good contractor for the wrong client is still a bad match.",
    closing: "UNPRO — It’s not about finding more. It’s about finding better.",
    impact: "Explore AI’s potential impact",
  };
  const reveal = (delay = 0) => ({
    initial: reduced ? false as const : { opacity: 1, y: 12 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.15 },
    transition: { duration: reduced ? 0 : 0.42, delay: reduced ? 0 : delay },
  });
  return (
    <section aria-labelledby="home-matching-title" className="home-matching-section alex-immersive border-t border-border bg-background px-5 py-16 sm:px-8 md:py-24">
      <div className="mx-auto max-w-5xl">
        <h2 id="home-matching-title" className="text-3xl font-semibold leading-tight tracking-normal text-foreground sm:text-4xl md:text-5xl">
          {copy.lines.map((line, i) => <motion.span key={i} {...reveal(i * 0.1)} className={`block ${i === 2 ? "text-primary-tint" : ""}`}>{line}</motion.span>)}
        </h2>
        <div className="mt-7 max-w-3xl space-y-3 text-base leading-relaxed text-muted-foreground">
          <p className="text-xl font-medium text-foreground">{copy.intro}</p>
          <p>{copy.explanation}</p><p>{copy.exclusive}</p>
          <p className="font-semibold text-foreground">{copy.match}</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {["contractor", "homeowner"].map((path, i) => {
            const contractor = path === "contractor";
            const Icon = contractor ? Wrench : Home;
            return <motion.article key={path} {...reveal(i * 0.08)} className="flex min-w-0 flex-col rounded-3xl border border-border bg-card p-6 shadow-lg sm:p-8">
              <Icon aria-hidden="true" className="h-7 w-7 text-primary-tint" />
              <h3 className="mt-5 text-xl font-semibold text-foreground">{contractor ? copy.contractor : copy.homeowner}</h3>
              <p className="mt-3 text-lg font-medium leading-relaxed text-foreground">{contractor ? copy.contractorPromise : copy.homeownerPromise}</p>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">{contractor ? copy.contractorBody : copy.homeownerBody}</p>
              <div className="mt-auto pt-7">
                {contractor ? <Button asChild className="h-auto min-h-12 w-full gap-2 whitespace-normal rounded-2xl bg-primary-strong px-4 py-3 text-base">
                  <Link to="/entrepreneur/devis-personnalise" onClick={() => trackCopilotEvent("contractor_entry_click", { surface: "home_matching", destination: "/entrepreneur/devis-personnalise" })}>{copy.contractorCta} <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" /></Link>
                </Button> : <Button onClick={() => { trackCopilotEvent("hero_find_pro_click", { surface: "home_matching" }); onStartHomeowner(); }} variant="outline" className="h-auto min-h-12 w-full gap-2 whitespace-normal rounded-2xl px-4 py-3 text-base">{copy.homeownerCta} <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" /></Button>}
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{contractor ? copy.contractorMicro : copy.homeownerMicro}</p>
                {contractor && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{copy.disclaimer}</p>}
              </div>
            </motion.article>;
          })}
        </div>
        <div className="mt-12 max-w-3xl space-y-4 text-base leading-relaxed text-muted-foreground">
          <p className="text-lg font-medium text-foreground">{copy.difference}</p>
          <p>{copy.closing}</p>
          <Button asChild variant="link" className="h-auto min-h-11 whitespace-normal px-0 text-left text-primary-tint"><Link to="/impact">{copy.impact} →</Link></Button>
        </div>
      </div>
    </section>
  );
}

function useStartAlex(surface: string) {
  const { openAlex } = useAlexVoice();
  return () => {
    useAlexStore.getState().markUserEngaged();
    openAlex(surface, "user_clicked_cta");
  };
}

function SectionWrap({
  children,
  tone = "base",
}: {
  children: React.ReactNode;
  tone?: "base" | "tinted";
}) {
  return (
    <section className={tone === "tinted" ? "bg-secondary/60" : "bg-transparent"}>
      <div className="mx-auto w-full max-w-5xl px-5 py-16 md:py-24">{children}</div>
    </section>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-primary">
      {children}
    </p>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-3 text-[clamp(1.6rem,4vw,2.4rem)] font-semibold leading-tight tracking-[-0.02em] text-foreground">
      {children}
    </h2>
  );
}

/* ── 1. Trois parcours visibles ──────────────────────────────── */
export function SectionTwoPaths() {
  const startAlex = useStartAlex("home_paths");
  return (
    <SectionWrap>
      <div className="mt-2 grid gap-5 md:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.4 }}
          className="rounded-3xl border border-border bg-card p-7 md:p-8"
        >
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
            <Home className="h-5 w-5" />
          </div>
          <h3 className="mt-5 text-xl font-semibold text-foreground">Vous êtes propriétaire ou gestionnaire ?</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
            Comprenez votre problème, documentez votre propriété et laissez Clara
            vous orienter vers le bon professionnel — sans courir après les
            soumissions.
          </p>
          <button
            onClick={startAlex}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            Parler à Clara <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.4, delay: 0.06 }}
          className="rounded-3xl border-2 border-primary/25 bg-card p-7 shadow-lg shadow-primary/10 md:p-8"
        >
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Wrench className="h-5 w-5" />
          </div>
          <h3 className="mt-5 text-xl font-semibold text-foreground">Vous êtes entrepreneur ?</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
            L'IA de UNPRO lit les signaux publics de votre entreprise —
            identité, spécialité, territoire, présence en ligne — et comprend
            exactement pourquoi elle peut (ou ne peut pas encore) vous
            recommander aux propriétaires.
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            L'audit vous montre ce qui est confirmé, ce qui manque, et comment
            devenir recommandable.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/entrepreneurs/audit-ia"
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-[15px] font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-transform hover:-translate-y-0.5"
            >
              Faire mon audit IA gratuit <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.4, delay: 0.12 }}
          className="rounded-3xl border border-border bg-card p-7 md:p-8"
        >
          <div className="flex items-center gap-3">
            <div
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl"
              style={{ background: "hsl(var(--sun) / 0.25)", color: "hsl(var(--sun-foreground))" }}
            >
              <Crown className="h-5 w-5" />
            </div>
            <span
              className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em]"
              style={{ background: "hsl(var(--sun) / 0.2)", color: "hsl(var(--sun-foreground))" }}
            >
              Membre fondateur
            </span>
          </div>
           <h3 className="mt-5 text-xl font-semibold text-foreground">Vous offrez des services aux propriétaires ?</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
             Réservez l'une des 10 places membre fondateur de votre ville et
             profitez de 12 mois de visibilité UNPRO sans frais, une valeur de 350 $.
          </p>

          <Link
            to="/fondateurs"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-[15px] font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-transform hover:-translate-y-0.5"
          >
            Réserver ma place gratuitement <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </SectionWrap>
  );
}

/* ── 2. Comment ça fonctionne — 4 étapes propriétaire ────────── */
const STEPS = [
  {
    icon: MessageSquare,
    title: "Décrivez votre situation",
    body: "Clara comprend le problème, le risque et l'urgence à partir de vos mots — jamais un long formulaire.",
  },
  {
    icon: Camera,
    title: "Montrez, c'est tout",
    body: "Ajoutez une photo ou une soumission reçue. Clara l'analyse et vous explique ce qu'elle contient.",
  },
  {
    icon: Search,
    title: "Comprenez avant de décider",
    body: "Ordre de grandeur, options et prochaines étapes utiles — avec la provenance de chaque information.",
  },
  {
    icon: BadgeCheck,
    title: "Un pro, au bon moment",
    body: "Quand c'est clair, UNPRO vous propose le professionnel qui correspond à votre projet et à votre secteur.",
  },
];

export function SectionHowItWorks() {
  return (
    <SectionWrap tone="tinted">
      <div className="text-center">
        <Eyebrow>Comment ça fonctionne</Eyebrow>
        <Title>Quatre étapes, aucune course aux soumissions</Title>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
            className="rounded-3xl border border-border bg-card p-6"
          >
            <div className="flex items-center gap-3">
              <span
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold"
                style={{ background: "hsl(var(--sun) / 0.25)", color: "hsl(var(--sun-foreground))" }}
              >
                {i + 1}
              </span>
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                <s.icon className="h-4.5 w-4.5" />
              </div>
            </div>
            <h3 className="mt-4 text-[16px] font-semibold text-foreground">{s.title}</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{s.body}</p>
          </motion.div>
        ))}
      </div>
    </SectionWrap>
  );
}

/* ── 3. Transparence des données ─────────────────────────────── */
const PROVENANCE = [
  { label: "Vérifié", body: "Confirmé auprès d'une source officielle ou par notre équipe." },
  { label: "Déclaré", body: "Fourni par l'entreprise elle-même, sans vérification indépendante." },
  { label: "Déduit", body: "Estimé à partir de sources publiques. Peut contenir des erreurs." },
  { label: "En attente", body: "Information demandée, pas encore obtenue." },
];

export function SectionTransparency() {
  return (
    <SectionWrap>
      <div className="grid gap-10 md:grid-cols-[1fr_1.1fr] md:items-center">
        <div>
          <Eyebrow>Transparence</Eyebrow>
          <Title>Vous voyez d'où vient chaque information</Title>
          <p className="mt-4 text-[15.5px] leading-relaxed text-muted-foreground">
            UNPRO n'invente ni note, ni certification, ni disponibilité. Chaque
            donnée affichée porte son niveau de provenance.
          </p>
        </div>

        <div className="grid gap-3">
          {PROVENANCE.map((p) => (
            <div
              key={p.label}
              className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5"
            >
              <span className="mt-0.5 shrink-0 rounded-full bg-secondary px-3 py-1 text-[12px] font-semibold text-secondary-foreground">
                {p.label}
              </span>
              <p className="text-[14.5px] leading-relaxed text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </SectionWrap>
  );
}

/* ── 4. Passeport Maison ─────────────────────────────────────── */
export function SectionPasseport() {
  return (
    <SectionWrap tone="tinted">
      <div className="grid gap-10 md:grid-cols-2 md:items-center">
        <div>
          <Eyebrow>Passeport Maison</Eyebrow>
          <Title>La mémoire documentée de votre propriété</Title>
          <p className="mt-4 text-[15.5px] leading-relaxed text-muted-foreground">
            Conservez vos travaux, vos soumissions et vos documents au même
            endroit. Chaque intervention enrichit l'historique de la maison et
            aide Clara à mieux vous conseiller la prochaine fois.
          </p>
          <Link
            to="/proprietaires/passeport-maison"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            Découvrir le Passeport <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="rounded-3xl border border-border bg-card p-7">
          <ul className="space-y-4">
            {[
              { icon: ClipboardList, t: "Travaux et soumissions archivés" },
              { icon: Search, t: "Documents analysés et résumés" },
              { icon: BadgeCheck, t: "Historique conservé pour la revente" },
            ].map((r) => (
              <li key={r.t} className="flex items-center gap-4">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                  <r.icon className="h-4.5 w-4.5" />
                </span>
                <span className="text-[15px] text-foreground">{r.t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SectionWrap>
  );
}

/* ── 5. CTA final ────────────────────────────────────────────── */
export function SectionFinalCta() {
  const startAlex = useStartAlex("home_final_cta");
  return (
    <SectionWrap>
      <div className="rounded-[32px] border border-border bg-card px-6 py-14 text-center md:px-12 md:py-20">
        <h2 className="mx-auto max-w-2xl text-[clamp(1.6rem,4vw,2.4rem)] font-semibold leading-tight tracking-[-0.02em] text-foreground">
          Commencez par une seule question.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[15.5px] leading-relaxed text-muted-foreground">
          Clara vous répond en français, comprend votre situation et vous guide
          vers la prochaine étape utile.
        </p>
        <button
          onClick={startAlex}
          className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-primary px-7 py-4 text-[15px] font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5"
        >
          Parler à Clara <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </SectionWrap>
  );
}
