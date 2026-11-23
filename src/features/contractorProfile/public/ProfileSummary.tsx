/**
 * Résumé « au-dessus du pli » d'une fiche entrepreneur, partagé par la fiche
 * publique et l'aperçu téléphone de l'espace entrepreneur.
 * Statut affiché uniquement s'il provient de `contractors.public_status`.
 */
import { CheckCircle2, Clock3, MapPin, MessageSquare, Phone, Sparkles } from "lucide-react";

export type SummaryLang = "fr" | "en";
export type SummaryStatus = { kind: "verified" | "pending"; label: string } | null;

const COPY = {
  fr: { verified: "Vérifié par UNPRO", pending: "Vérification en cours", cta: "Vérifier avec Clara", call: "Appeler", message: "Texto", more: (n: number) => `+ ${n} autre${n > 1 ? "s" : ""} ville${n > 1 ? "s" : ""}`, photo: (name: string) => `Réalisation de ${name}` },
  en: { verified: "Verified by UNPRO", pending: "Verification in progress", cta: "Check with Clara", call: "Call", message: "Text", more: (n: number) => `+ ${n} more ${n > 1 ? "cities" : "city"}`, photo: (name: string) => `Project by ${name}` },
};

export function profileStatus(publicStatus: string | null | undefined, lang: SummaryLang = "fr"): SummaryStatus {
  const t = COPY[lang] ?? COPY.fr;
  if (publicStatus === "verified_active") return { kind: "verified", label: t.verified };
  if (publicStatus === "published_pending_verification") return { kind: "pending", label: t.pending };
  return null;
}

export function areaLabel(primary: string | null | undefined, total: number, lang: SummaryLang = "fr") {
  if (!primary) return null;
  const extra = Math.max(0, total - 1);
  return extra > 0 ? `${primary} ${(COPY[lang] ?? COPY.fr).more(extra)}` : primary;
}

type Props = {
  name: string;
  logoUrl?: string | null;
  onLogoError?: () => void;
  specialty?: string | null;
  publicStatus?: string | null;
  chips?: string[];
  area?: string | null;
  photoUrl?: string | null;
  phone?: string | null;
  lang?: SummaryLang;
  /** Aperçu non interactif (dans un bouton parent). */
  preview?: boolean;
  onPrimary?: () => void;
};

export default function ProfileSummary({ name, logoUrl, onLogoError, specialty, publicStatus, chips = [], area, photoUrl, phone, lang = "fr", preview = false, onPrimary }: Props) {
  const t = COPY[lang] ?? COPY.fr;
  const status = profileStatus(publicStatus, lang);
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "UN";
  const tel = phone?.replace(/[^+\d]/g, "") || null;
  const shownChips = Array.from(new Set(chips.filter(Boolean))).slice(0, 3);
  const small = preview ? "text-[11px]" : "text-xs";
  const secondary = "inline-flex flex-1 items-center justify-center gap-1.5 rounded-button border border-border bg-card/70 font-medium text-text-strong";

  return (
    <div className="space-y-3" data-testid="profile-summary">
      {photoUrl && <img src={photoUrl} alt={t.photo(name)} className={`w-full rounded-2xl object-cover ${preview ? "h-24" : "h-36"}`} loading="lazy" />}
      <div className="flex items-center gap-3">
        <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-primary/40 bg-card shadow-glow ${preview ? "h-12 w-12" : "h-[72px] w-[72px] sm:h-20 sm:w-20"}`}>
          {logoUrl ? <img src={logoUrl} alt={`Logo ${name}`} onError={onLogoError} className="h-full w-full object-cover" /> : <span className={`font-bold text-primary ${preview ? "text-base" : "text-xl"}`}>{initials}</span>}
        </div>
        <div className="min-w-0">
          {preview ? <p className="break-words text-sm font-semibold leading-tight text-text-strong">{name}</p> : <h1 className="break-words text-xl font-bold leading-tight text-text-strong sm:text-3xl">{name}</h1>}
          {specialty && <p className={`mt-0.5 text-text-secondary ${preview ? "text-[11px]" : "text-sm"}`}>{specialty}</p>}
          {status && (
            <span data-testid="profile-status" className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${small} ${status.kind === "verified" ? "border-success/40 text-success" : "border-border text-text-secondary"}`}>
              {status.kind === "verified" ? <CheckCircle2 className="h-3 w-3" aria-hidden /> : <Clock3 className="h-3 w-3" aria-hidden />}{status.label}
            </span>
          )}
        </div>
      </div>
      {shownChips.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Services">
          {shownChips.map((chip) => <li key={chip} className={`rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-text-strong ${small}`}>{chip}</li>)}
        </ul>
      )}
      {area && <p className={`flex items-center gap-1.5 text-text-secondary ${small}`}><MapPin className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />{area}</p>}
      {preview ? (
        <div className="space-y-2" aria-hidden>
          <span className="flex items-center justify-center gap-1.5 rounded-button bg-primary py-2 text-xs font-medium text-primary-foreground"><Sparkles className="h-3.5 w-3.5" />{t.cta}</span>
          {tel && <span className="flex gap-2 text-[11px]"><span className={`${secondary} py-1.5`}><Phone className="h-3 w-3" />{t.call}</span><span className={`${secondary} py-1.5`}><MessageSquare className="h-3 w-3" />{t.message}</span></span>}
        </div>
      ) : (
        <div className="space-y-2 sm:flex sm:items-center sm:gap-2 sm:space-y-0">
          {onPrimary && (
            <button type="button" onClick={onPrimary} data-testid="profile-primary-cta" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-button bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-glow transition-transform duration-[420ms] ease-[cubic-bezier(.22,1,.36,1)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto">
              <Sparkles className="h-4 w-4" aria-hidden />{t.cta}
            </button>
          )}
          {tel && (
            <div className="flex gap-2 text-sm">
              <a href={`tel:${tel}`} className={`${secondary} min-h-11 px-4`}><Phone className="h-4 w-4" aria-hidden />{t.call}</a>
              <a href={`sms:${tel}`} className={`${secondary} min-h-11 px-4`}><MessageSquare className="h-4 w-4" aria-hidden />{t.message}</a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
