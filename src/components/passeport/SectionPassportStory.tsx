/**
 * UNPRO — Passeport Maison narrative sections (public).
 * « Votre maison a une histoire. Conservez-la. »
 * All copy flows from src/lib/copy/passportPositioning.ts.
 */
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  PASSPORT_STORY_H1,
  PASSPORT_STORY_SUB,
  PASSPORT_STORY_SUPPORT,
  PASSPORT_PRIMARY_CTA,
  PASSPORT_PRIMARY_HREF,
  PASSPORT_PERIODS,
  PASSPORT_RESALE,
  PASSPORT_PROOF_SUB,
  PROVENANCE_LABELS,
} from "@/lib/copy/passportPositioning";
import { ArrowRight, CalendarClock, FolderOpen, ShieldCheck } from "lucide-react";

const PERIOD_ICONS = [FolderOpen, CalendarClock, ShieldCheck];

export function SectionPassportHero() {
  return (
    <section className="relative overflow-hidden">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl"
        >
          <span className="text-meta uppercase tracking-[0.2em] text-muted-foreground">
            Passeport Maison
          </span>
          <h1 className="text-hero-sm md:text-hero mt-3 text-foreground">{PASSPORT_STORY_H1}</h1>
          <p className="mt-5 text-body-lg leading-relaxed text-muted-foreground">
            {PASSPORT_STORY_SUB}
          </p>
          <p className="mt-3 text-body leading-relaxed text-muted-foreground">
            {PASSPORT_STORY_SUPPORT}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="gap-2 rounded-full px-6">
              <Link to={PASSPORT_PRIMARY_HREF}>
                {PASSPORT_PRIMARY_CTA} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{PASSPORT_PROOF_SUB}</p>
        </motion.div>
      </div>
    </section>
  );
}

export function SectionPassportPeriods() {
  return (
    <section className="border-t border-border/60">
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-section text-foreground">Trois moments où votre dossier compte</h2>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {PASSPORT_PERIODS.map((period, i) => {
            const Icon = PERIOD_ICONS[i] ?? FolderOpen;
            return (
              <motion.article
                key={period.key}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="rounded-2xl border border-border bg-card/60 p-6 shadow-elevation backdrop-blur-xl"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" aria-hidden />
                </div>
                <span className="text-meta uppercase tracking-[0.18em] text-muted-foreground">
                  {period.label}
                </span>
                <h3 className="mt-1.5 text-lg font-semibold text-foreground">{period.title}</h3>
                <ul className="mt-4 space-y-2 text-sm leading-relaxed text-muted-foreground">
                  {period.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                {"note" in period && period.note && (
                  <p className="mt-4 border-t border-border/60 pt-3 text-xs leading-relaxed text-muted-foreground">
                    {period.note}
                  </p>
                )}
              </motion.article>
            );
          })}
        </div>

        {/* Provenance legend */}
        <div className="mt-8 flex flex-wrap gap-3">
          {Object.entries(PROVENANCE_LABELS).map(([key, meta]) => (
            <span
              key={key}
              className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground"
            >
              <span className="font-semibold text-foreground">{meta.label}</span> · {meta.help}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SectionPassportResale() {
  return (
    <section className="border-t border-border/60">
      <div className="container mx-auto px-4 py-16 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl rounded-3xl border border-border bg-card/60 p-8 text-center shadow-elevation backdrop-blur-xl md:p-12"
        >
          <h2 className="text-section text-foreground">{PASSPORT_RESALE.title}</h2>
          <p className="mt-4 text-body-lg leading-relaxed text-muted-foreground">
            {PASSPORT_RESALE.body}
          </p>
          <p className="mt-6 font-display text-2xl font-bold text-foreground md:text-3xl">
            {PASSPORT_RESALE.punch}
          </p>
          <Button asChild size="lg" className="mt-8 gap-2 rounded-full px-6">
            <Link to={PASSPORT_PRIMARY_HREF}>
              {PASSPORT_RESALE.cta} <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
