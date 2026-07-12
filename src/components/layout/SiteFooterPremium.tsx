/**
 * SiteFooterPremium — Premium dark footer for the global public layout.
 * Replaces SiteFooterIntelligence + SmartFooter. Trust-focused, mobile-first.
 */
import { Link } from "react-router-dom";

type FooterLink = { label: string; to: string };

const HOMEOWNER_LINKS: FooterLink[] = [
  { label: "Passeport Maison", to: "/pim" },
  { label: "Score Maison", to: "/dashboard/home-score" },
  { label: "Trouver un entrepreneur", to: "/alex" },
  { label: "Vérifier un entrepreneur", to: "/verifier-entrepreneur" },
  { label: "Intelligence copropriété", to: "/copropriete" },
  { label: "Alex", to: "/alex" },
];

const CONTRACTOR_LINKS: FooterLink[] = [
  { label: "Être recommandé par l'IA", to: "/entrepreneurs" },
  { label: "Activation 7 jours à 1 $", to: "/pro/activate" },
  { label: "Plans et tarifs", to: "/pricing/entrepreneurs" },
  { label: "Fonctionnement", to: "/comment-fonctionne-ia" },
  { label: "Centre d'aide", to: "/aide" },
];

const RESOURCE_LINKS: FooterLink[] = [
  { label: "Journal", to: "/journal" },
  { label: "FAQ", to: "/faq" },
  { label: "Contact", to: "/contact" },
];

const TRUST_LINKS: FooterLink[] = [
  { label: "Politique de confidentialité", to: "/confidentialite" },
  { label: "Conditions d'utilisation", to: "/conditions" },
  { label: "Vérification RBQ", to: "/verifier-entrepreneur" },
];

function Column({ title, items }: { title: string; items: FooterLink[] }) {
  return (
    <div>
      <h3 className="text-[11px] uppercase tracking-[0.22em] font-semibold text-foreground/70 mb-5">
        {title}
      </h3>
      <ul className="space-y-3">
        {items.map((it) => (
          <li key={it.to + it.label}>
            <Link
              to={it.to}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors leading-snug"
            >
              {it.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SiteFooterPremium() {
  return (
    <footer
      aria-label="Pied de page UNPRO"
      className="relative border-t border-white/10"
      style={{ backgroundColor: "#050816" }}
    >
      <div className="mx-auto max-w-7xl px-6 pt-16 md:pt-20 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-20">
        {/* Brand block */}
        <div className="max-w-2xl mb-14 md:mb-16">
          <div className="text-3xl md:text-4xl font-bold tracking-[-0.04em] text-foreground mb-5">
            UNPRO
          </div>
          <p className="text-base md:text-lg text-foreground/85 leading-relaxed mb-3">
            L'intelligence artificielle au service des propriétaires québécois.
          </p>
          <p className="text-sm md:text-[15px] text-muted-foreground leading-relaxed">
            UNPRO aide les propriétaires à comprendre leur maison, conserver son
            historique, anticiper les problèmes et trouver les bons
            professionnels au bon moment.
          </p>
        </div>

        {/* 4 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
          <Column title="Pour les propriétaires" items={HOMEOWNER_LINKS} />
          <Column title="Pour les entrepreneurs" items={CONTRACTOR_LINKS} />
          <Column title="Ressources" items={RESOURCE_LINKS} />
          <Column title="Confiance" items={TRUST_LINKS} />
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-6 border-t border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>UNPRO © 2026</div>
          <div className="italic text-foreground/70">
            Votre maison devrait se souvenir de tout.
          </div>
          <div>Québec • Canada</div>
        </div>
      </div>
    </footer>
  );
}
