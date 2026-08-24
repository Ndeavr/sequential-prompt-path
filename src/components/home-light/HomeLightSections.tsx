/**
 * HomeLightSections — Homeowner-first light sections for the UNPRO homepage.
 * Spacious premium layout, navy text, royal-blue actions, no fabricated data.
 * Every claim is either a product behaviour or an explicit provenance label.
 */
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Camera,
  ClipboardList,
  Home,
  MessageSquare,
  Search,
  Wrench,
} from "lucide-react";

import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { useAlexStore } from "@/features/alex/state/alexStore";

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

/* ── 1. Deux parcours visibles ───────────────────────────────── */
export function SectionTwoPaths() {
  const startAlex = useStartAlex("home_paths");
  return (
    <SectionWrap>
      <div className="text-center">
        <Eyebrow>Deux parcours</Eyebrow>
        <Title>Vous êtes propriétaire ou entrepreneur ?</Title>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
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
          <h3 className="mt-5 text-xl font-semibold text-foreground">Propriétaire</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
            Comprenez votre problème, documentez votre propriété et laissez Alex
            vous orienter vers le bon professionnel.
          </p>
          <button
            onClick={startAlex}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            Parler à Alex <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.4, delay: 0.06 }}
          className="rounded-3xl border border-border bg-card p-7 md:p-8"
        >
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
            <Wrench className="h-5 w-5" />
          </div>
          <h3 className="mt-5 text-xl font-semibold text-foreground">Entrepreneur</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
            Voyez comment l'IA comprend votre entreprise aujourd'hui, puis
            complétez votre profil pour être recommandé sur les bons projets.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/entrepreneurs/audit-ia"
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              Audit IA gratuit <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/entrepreneur/garantie"
              className="inline-flex items-center rounded-2xl border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground transition-transform hover:-translate-y-0.5"
            >
              Voir l'offre d'entrée
            </Link>
          </div>
        </motion.div>
      </div>
    </SectionWrap>
  );
}

/* ── 2. Comment ça fonctionne ────────────────────────────────── */
const STEPS = [
  {
    icon: MessageSquare,
    title: "Une question à la fois",
    body: "Alex pose les bonnes questions pour cerner le problème, le risque et l'urgence — jamais un long formulaire.",
  },
  {
    icon: Camera,
    title: "Photos et documents",
    body: "Ajoutez une photo ou une soumission reçue. Alex l'analyse et vous explique ce qu'elle contient.",
  },
  {
    icon: BadgeCheck,
    title: "Une recommandation claire",
    body: "Un professionnel proposé selon votre projet et votre secteur, avec la provenance de chaque information.",
  },
];

export function SectionHowItWorks() {
  return (
    <SectionWrap tone="tinted">
      <div className="text-center">
        <Eyebrow>Comment ça fonctionne</Eyebrow>
        <Title>Trois étapes, aucune course aux soumissions</Title>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
            className="rounded-3xl border border-border bg-card p-7"
          >
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
              <s.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-foreground">{s.title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{s.body}</p>
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
            aide Alex à mieux vous conseiller la prochaine fois.
          </p>
          <Link
            to="/passeport-maison"
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
          Alex vous répond en français, comprend votre situation et vous guide
          vers la prochaine étape utile.
        </p>
        <button
          onClick={startAlex}
          className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-primary px-7 py-4 text-[15px] font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5"
        >
          Parler à Alex <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </SectionWrap>
  );
}
