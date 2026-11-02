/**
 * Shared legal footer bar for public pages (FR/EN). Single source for legal
 * links, cookie preferences entry point, copyright and origin line.
 */
import { Link } from "react-router-dom";
import UnproLogo from "@/components/brand/UnproLogo";
import { useLanguage } from "@/components/ui/LanguageToggle";
import { openCookiePreferences } from "@/lib/cookieConsent";
import CookieConsentBanner from "@/components/legal/CookieConsentBanner";

export const LEGAL_LINKS = {
  fr: [
    { label: "Conditions d'utilisation", to: "/conditions" },
    { label: "Confidentialité (Loi 25)", to: "/confidentialite" },
    { label: "Politique relative aux témoins", to: "/cookies" },
    { label: "Politique linguistique — Loi 96", to: "/politique-linguistique" },
    { label: "Contact", to: "/contact" },
  ],
  en: [
    { label: "Terms of use", to: "/conditions" },
    { label: "Privacy (Law 25)", to: "/confidentialite" },
    { label: "Cookie policy", to: "/cookies" },
    { label: "Language policy — Bill 96", to: "/politique-linguistique" },
    { label: "Contact", to: "/contact" },
  ],
} as const;

const COPY = {
  fr: { manage: "Gérer mes témoins", rights: "Tous droits réservés.", made: "Fait au Québec, Canada.", aria: "Liens légaux" },
  en: { manage: "Manage my cookies", rights: "All rights reserved.", made: "Made in Québec, Canada.", aria: "Legal links" },
};

export default function LegalFooterBar({ withLogo = false }: { withLogo?: boolean }) {
  const { lang } = useLanguage();
  const l = lang === "en" ? "en" : "fr";
  const c = COPY[l];
  const item =
    "inline-flex min-h-[44px] items-center text-sm text-foreground/80 hover:text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded";

  return (
    <footer
      lang={l}
      aria-label={c.aria}
      className="alex-immersive relative z-0 border-t border-white/10 bg-background"
    >
      <div className="mx-auto max-w-7xl px-5 pt-6 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] lg:pb-8">
        {withLogo && <UnproLogo size={120} tone="dark" className="mb-4" />}
        <nav aria-label={c.aria}>
          <ul className="flex flex-col sm:flex-row sm:flex-wrap gap-x-6 gap-y-0">
            {LEGAL_LINKS[l].map((it) => (
              <li key={it.to}>
                <Link to={it.to} className={item}>{it.label}</Link>
              </li>
            ))}
            <li>
              <button type="button" onClick={openCookiePreferences} className={item}>
                {c.manage}
              </button>
            </li>
          </ul>
        </nav>
        <div className="mt-4 flex flex-col sm:flex-row sm:justify-between gap-1 text-xs text-foreground/75">
          <p>© {new Date().getFullYear()} UNPRO. {c.rights}</p>
          <p>{c.made}</p>
        </div>
      </div>
      <CookieConsentBanner />
    </footer>
  );
}
