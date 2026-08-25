/**
 * UNPRO — Audit IA Pro Header
 * Black top navigation for the contractor acquisition funnel:
 * official UNPRO wordmark, real route links, trust chips, gold CTA.
 */
import { Link } from "react-router-dom";
import { ShieldCheck, CreditCard, MapPin } from "lucide-react";
import { BRAND } from "@/config/branding";

const NAV_LINKS = [
  { label: "Comment ça marche", to: "/entrepreneurs/comment-ca-marche" },
  { label: "Forfaits", to: "#forfaits" },
  { label: "Journal", to: "/journal" },
] as const;

const TRUST_CHIPS = [
  { label: "Données réelles uniquement", Icon: ShieldCheck },
  { label: "Aucune carte requise", Icon: CreditCard },
  { label: "Fait au Québec", Icon: MapPin },
] as const;

export function AuditProHeader({ onAuditClick }: { onAuditClick: () => void }) {
  return (
    <header
      className="sticky top-0 z-50 border-b border-white/10"
      style={{ background: "hsl(var(--nav-black))", color: "hsl(var(--nav-black-foreground))" }}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/entrepreneurs/audit-ia" className="flex shrink-0 items-center gap-2.5" aria-label="UNPRO — Audit IA">
          <img src={BRAND.logo} alt="UNPRO" className="h-7 w-auto" width={1133} height={286} />
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Navigation entrepreneur">
          {NAV_LINKS.map((l) =>
            l.to.startsWith("#") ? (
              <a
                key={l.label}
                href={l.to}
                className="text-[13px] font-medium text-white/70 transition-colors hover:text-white"
              >
                {l.label}
              </a>
            ) : (
              <Link
                key={l.label}
                to={l.to}
                className="text-[13px] font-medium text-white/70 transition-colors hover:text-white"
              >
                {l.label}
              </Link>
            ),
          )}
        </nav>

        <div className="hidden items-center gap-2 lg:flex" aria-label="Garanties">
          {TRUST_CHIPS.map(({ label, Icon }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-medium text-white/75"
            >
              <Icon className="h-3 w-3 text-[hsl(46_85%_55%)]" aria-hidden />
              {label}
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={onAuditClick}
          className="gold-btn shrink-0 rounded-full px-4 py-2.5 text-[13px] font-bold uppercase tracking-wide transition-transform hover:-translate-y-0.5 sm:px-5"
        >
          Audit IA gratuit
        </button>
      </div>
    </header>
  );
}
