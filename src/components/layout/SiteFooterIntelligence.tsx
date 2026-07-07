/**
 * UNPRO — Site Footer Intelligence
 * Trust + ecosystem footer reinforcing the Home Intelligence positioning.
 * Sits above the role-aware SmartFooter on every public page (via MainLayout).
 */

import { Link } from "react-router-dom";
import { INTELLIGENCE_HUB_CATEGORIES } from "@/data/intelligenceHubCategories";

const HOMEOWNER_SOLUTIONS = [
  { label: "Comment ça fonctionne",        to: "/comment-fonctionne-ia" },
  { label: "Passeport Intelligence Maison", to: "/pim" },
  { label: "Vérifier un entrepreneur",     to: "/verifier-entrepreneur" },
  { label: "Comparer des soumissions",     to: "/compare-quotes" },
  { label: "Analyse de factures",          to: "/dashboard/documents/upload" },
  { label: "Diagnostic par photo",         to: "/diagnostic-photo" },
  { label: "Subventions et programmes",    to: "/guides" },
  { label: "Urgences résidentielles",      to: "/alex" },
];

const HOMEOWNER_INTELLIGENCE = [
  { label: "Ma maison se souvient de tout", to: "/pim" },
  { label: "Historique des rénovations",    to: "/dashboard/properties" },
  { label: "Garanties et documents",        to: "/dashboard/documents/upload" },
  { label: "Entretien préventif",           to: "/entretien-preventif" },
  { label: "Valeur de propriété",           to: "/dashboard/home-score" },
  { label: "Dossier numérique de la maison", to: "/dashboard/properties" },
];

const CONTRACTOR_GROWTH = [
  { label: "Activer mon profil",                  to: "/pro/activate" },
  { label: "Pourquoi être recommandé par l'IA",   to: "/pourquoi-unpro" },
  { label: "Comment fonctionne le score AIPP",    to: "/aipp-score" },
  { label: "Rendez-vous exclusifs",               to: "/entrepreneurs" },
  { label: "Recommandations Alex",                to: "/alex" },
  { label: "Tarifs",                              to: "/pricing" },
];

const CONTRACTOR_RESOURCES = [
  { label: "Guide IA pour entrepreneurs",     to: "/guides" },
  { label: "Comment l'IA choisit les entreprises", to: "/comment-fonctionne-ia" },
  { label: "Optimiser sa visibilité IA",      to: "/pro/aipp-score" },
  { label: "FAQ entrepreneurs",               to: "/cest-quoi-unpro" },
];

const ABOUT_LINKS = [
  { label: "Notre mission",                          to: "/pourquoi-unpro" },
  { label: "Le Manifeste UNPRO",                     to: "/manifeste" },
  { label: "Pourquoi nous ne demandons pas 3 soumissions", to: "/pourquoi-pas-trois-soumissions" },
  { label: "Comment nous sélectionnons les entrepreneurs", to: "/comment-fonctionne-ia" },
  { label: "Couverture",                             to: "/couverture" },
  { label: "Contact",                                to: "/contact" },
];

function Column({ title, items }: { title: string; items: { label: string; to: string }[] }) {
  return (
    <div>
      <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-foreground/80 mb-4">
        {title}
      </h3>
      <ul className="space-y-2.5">
        {items.map((it) => (
          <li key={it.to + it.label}>
            <Link
              to={it.to}
              className="text-[13px] text-muted-foreground hover:text-foreground transition-colors leading-snug"
            >
              {it.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SiteFooterIntelligence() {
  return (
    <section
      aria-label="UNPRO — Passeport Maison"
      className="relative border-t border-border/20"
      style={{
        background:
          "linear-gradient(180deg, hsl(220 40% 5% / 0.6) 0%, hsl(220 45% 4% / 0.95) 100%)",
      }}
    >
      <div className="mx-auto max-w-7xl px-4 lg:px-6 py-12 lg:py-16">
        {/* Trust block */}
        <div className="max-w-3xl mb-12">
          <p className="text-[11px] tracking-[0.22em] uppercase text-primary/80 mb-3">
            Passeport Maison du Québec
          </p>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-[-0.02em] text-foreground leading-tight mb-3">
            Votre maison devrait se souvenir de tout.
          </h2>
          <p className="text-[14px] text-muted-foreground leading-relaxed max-w-2xl">
            UNPRO conserve l'historique des rénovations, garanties, inspections,
            soumissions et décisions importantes — afin de vous aider à prendre
            de meilleures décisions année après année.
          </p>
        </div>

        {/* 4 columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-10">
          <div className="col-span-2 md:col-span-1 space-y-8">
            <Column title="Propriétaires · Solutions" items={HOMEOWNER_SOLUTIONS.slice(0, 6)} />
            <Column title="Intelligence Maison" items={HOMEOWNER_INTELLIGENCE} />
          </div>

          <div className="col-span-2 md:col-span-1 space-y-8">
            <Column title="Entrepreneurs · Croissance IA" items={CONTRACTOR_GROWTH} />
            <Column title="Ressources" items={CONTRACTOR_RESOURCES} />
          </div>

          <div className="col-span-2 md:col-span-1">
            <Column title="À propos d'UNPRO" items={ABOUT_LINKS} />
          </div>

          <div className="col-span-2 md:col-span-1">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-foreground/80 mb-4">
              Intelligence Hub
            </h3>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-2">
              {INTELLIGENCE_HUB_CATEGORIES.map((c) => (
                <li key={c.slug}>
                  <Link
                    to={c.href}
                    className="text-[12.5px] text-muted-foreground hover:text-foreground transition-colors leading-snug"
                  >
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              to="/intelligence"
              className="inline-block mt-4 text-[12px] font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Explorer le Passeport Maison →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
