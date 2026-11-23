/**
 * Aperçu téléphone de la fiche publique réelle (données `contractors`).
 * Un clic redresse le téléphone puis ouvre l'éditeur existant `/pro/profile`,
 * qui sauvegarde et revient à l'aperçu public `/pro/profile/public/:id`.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PenLine } from "lucide-react";
import ProfileSummary from "@/features/contractorProfile/public/ProfileSummary";
import { useLanguage } from "@/components/ui/LanguageToggle";

type Profile = {
  id: string;
  business_name?: string | null;
  specialty?: string | null;
  city?: string | null;
  description?: string | null;
  phone?: string | null;
  website?: string | null;
  logo_url?: string | null;
  public_status?: string | null;
  portfolio_urls?: string[] | null;
};

const COPY = {
  fr: { aria: "Modifier ma fiche publique", hint: "Touchez pour modifier logo, description, services, zones, coordonnées et photos", empty: "Ajoutez une description pour présenter votre entreprise.", view: "Voir ma fiche publique", edit: "Modifier" },
  en: { aria: "Edit my public profile", hint: "Tap to edit logo, description, services, areas, contact details and photos", empty: "Add a description to present your business.", view: "View my public profile", edit: "Edit" },
};

export default function ProfilePhonePreview({ profile }: { profile: Profile }) {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const t = COPY[lang] ?? COPY.fr;
  const [opening, setOpening] = useState(false);
  const name = profile.business_name || "—";

  const open = () => {
    if (opening) return;
    setOpening(true);
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => navigate("/pro/profile"), reduce ? 0 : 420);
  };

  return (
    <section className="flex flex-col items-center gap-3 py-2" aria-label={t.view} data-testid="profile-phone-preview">
      <button
        type="button"
        onClick={open}
        aria-label={t.aria}
        className={`group relative w-[220px] sm:w-[240px] rounded-[2.25rem] border border-border bg-card p-2 shadow-2xl transition-transform duration-[420ms] ease-[cubic-bezier(.22,1,.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${opening ? "rotate-0" : "-rotate-6 hover:-translate-y-0.5 hover:-rotate-3"}`}
      >
        <span className="absolute left-1/2 top-3 z-10 h-4 w-16 -translate-x-1/2 rounded-full bg-muted" aria-hidden />
        <div className="flex h-[460px] flex-col overflow-hidden rounded-[1.75rem] bg-background text-left">
          <div className="flex-1 space-y-3 overflow-hidden px-4 pb-3 pt-9">
            <ProfileSummary
              preview
              lang={lang}
              name={name}
              logoUrl={profile.logo_url}
              specialty={profile.specialty}
              publicStatus={profile.public_status}
              chips={profile.specialty ? [profile.specialty] : []}
              area={profile.city}
              photoUrl={profile.portfolio_urls?.find(Boolean) ?? null}
              phone={profile.phone}
            />
            <p className="line-clamp-3 text-[11px] leading-relaxed text-muted-foreground">{profile.description || t.empty}</p>
          </div>
          <div className="m-3 flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2 text-xs font-medium text-primary-foreground">
            <PenLine className="h-3.5 w-3.5" aria-hidden />{t.edit}
          </div>
        </div>
      </button>
      <p className="max-w-xs text-center text-xs text-muted-foreground">{t.hint}</p>
      <button type="button" onClick={() => navigate(`/pro/profile/public/${profile.id}`)} className="min-h-11 text-sm text-primary underline underline-offset-4">{t.view}</button>
    </section>
  );
}
