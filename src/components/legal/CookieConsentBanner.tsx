/**
 * Cookie consent banner + preferences (Loi 25).
 * Accept / Refuse / Customize with equal prominence. Optional categories
 * unchecked by default. Reopened from the footer via openCookiePreferences().
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/components/ui/LanguageToggle";
import { OPEN_PREFS_EVENT, readConsent, saveConsent } from "@/lib/cookieConsent";

const T = {
  fr: {
    title: "Vos choix de témoins",
    body: "Nous utilisons des témoins essentiels au fonctionnement du site. Les témoins optionnels (mesure d'audience, marketing) restent désactivés tant que vous ne les acceptez pas.",
    accept: "Tout accepter",
    refuse: "Tout refuser",
    customize: "Personnaliser",
    save: "Enregistrer mes choix",
    essential: "Essentiels (toujours actifs)",
    essentialDesc: "Connexion, sécurité, langue et préférences.",
    analytics: "Mesure d'audience",
    analyticsDesc: "Statistiques de fréquentation pour améliorer le site.",
    marketing: "Marketing",
    marketingDesc: "Mesure des campagnes publicitaires.",
    policy: "Politique relative aux témoins",
  },
  en: {
    title: "Your cookie choices",
    body: "We use essential cookies needed for the site to work. Optional cookies (audience measurement, marketing) stay off unless you accept them.",
    accept: "Accept all",
    refuse: "Refuse all",
    customize: "Customize",
    save: "Save my choices",
    essential: "Essential (always on)",
    essentialDesc: "Sign-in, security, language and preferences.",
    analytics: "Audience measurement",
    analyticsDesc: "Traffic statistics to improve the site.",
    marketing: "Marketing",
    marketingDesc: "Advertising campaign measurement.",
    policy: "Cookie policy",
  },
};

export default function CookieConsentBanner() {
  const { lang } = useLanguage();
  const t = T[lang] ?? T.fr;
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (!readConsent()) setOpen(true);
    const onOpen = () => {
      const c = readConsent();
      setAnalytics(c?.analytics ?? false);
      setMarketing(c?.marketing ?? false);
      setCustom(true);
      setOpen(true);
    };
    window.addEventListener(OPEN_PREFS_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_PREFS_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      // Escape = no decision stored; banner returns on next visit.
      if (e.key === "Escape" && readConsent()) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const decide = (a: boolean, m: boolean) => {
    saveConsent({ analytics: a, marketing: m });
    setOpen(false);
    setCustom(false);
  };

  const btn =
    "min-h-[44px] px-4 rounded-full text-sm font-semibold border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      lang={lang}
      className="fixed inset-x-0 bottom-0 z-[90] p-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]"
    >
      <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-background text-foreground shadow-2xl p-4 md:p-5">
        <h2 id="cookie-consent-title" className="text-base font-semibold mb-1">{t.title}</h2>
        <p className="text-sm text-foreground/80 leading-relaxed">
          {t.body}{" "}
          <Link to="/cookies" className="underline underline-offset-2 text-primary">{t.policy}</Link>
        </p>

        {custom && (
          <fieldset className="mt-4 space-y-3">
            <legend className="sr-only">{t.customize}</legend>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" checked disabled className="mt-1 h-4 w-4" />
              <span><span className="font-medium">{t.essential}</span><br /><span className="text-foreground/75">{t.essentialDesc}</span></span>
            </label>
            <label className="flex items-start gap-3 text-sm cursor-pointer">
              <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} className="mt-1 h-4 w-4" />
              <span><span className="font-medium">{t.analytics}</span><br /><span className="text-foreground/75">{t.analyticsDesc}</span></span>
            </label>
            <label className="flex items-start gap-3 text-sm cursor-pointer">
              <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-1 h-4 w-4" />
              <span><span className="font-medium">{t.marketing}</span><br /><span className="text-foreground/75">{t.marketingDesc}</span></span>
            </label>
          </fieldset>
        )}

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button type="button" className={`${btn} bg-background`} onClick={() => decide(false, false)}>{t.refuse}</button>
          {custom ? (
            <button type="button" className={`${btn} bg-background`} onClick={() => decide(analytics, marketing)}>{t.save}</button>
          ) : (
            <button type="button" className={`${btn} bg-background`} onClick={() => setCustom(true)}>{t.customize}</button>
          )}
          <button type="button" className={`${btn} bg-primary text-primary-foreground border-primary`} onClick={() => decide(true, true)}>{t.accept}</button>
        </div>
      </div>
    </div>
  );
}
