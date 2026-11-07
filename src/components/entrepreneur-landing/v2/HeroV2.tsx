/** Website-first entry into the existing progressive matching profile. */
import { contractorLoginPath } from "@/lib/routing/contractorAuthHandoff";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate, useLocation } from "react-router-dom";
import LanguageToggle, { useLanguage } from "@/components/ui/LanguageToggle";
import UnproLogo from "@/components/brand/UnproLogo";
import { contractorProfileEntryPath, normalizeContractorEntry } from "@/lib/contractorProfileEntry";

interface Props { onTrackCta: (key: string, section: string) => void; }

export default function HeroV2({ onTrackCta }: Props) {
  const navigate = useNavigate();
  const { search } = useLocation();
  const { lang, setLang } = useLanguage();
  const fr = lang === "fr";
  const [kind, setKind] = useState<"website" | "name">("website");
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  return (
    <section className="relative px-5 pb-12 pt-6">
      <div className="mx-auto mb-12 flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <UnproLogo size={92} variant="primary" animated={false} />
        <LanguageToggle lang={lang} onChange={setLang} />
        <Button variant="ghost" onClick={() => navigate(contractorLoginPath(contractorProfileEntryPath(search, lang)))}>
          {fr ? "Connexion" : "Sign in"}
        </Button>
      </div>
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="font-display text-3xl font-bold leading-tight text-foreground sm:text-5xl">
          {fr ? "Plus de visibilité. Des projets qui correspondent à votre entreprise." : "More visibility. Projects that fit your business."}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {fr ? "Faites connaître à Clara vos services, votre territoire et les travaux que vous voulez vraiment réaliser. Elle pourra vous proposer aux propriétaires dont le projet correspond à votre profil." : "Tell Clara about your services, your service area and the work you really want to do. She can then put your business forward to homeowners whose projects fit your profile."}
        </p>
        <form className="mx-auto mt-8 max-w-lg text-left" onSubmit={(event) => {
          event.preventDefault();
          const entry = normalizeContractorEntry(value, kind);
          if (!entry) { setError(true); return; }
          onTrackCta("hero_prepare_profile", "hero");
          navigate(contractorProfileEntryPath(search, lang, entry));
        }}>
          <label htmlFor="contractor-entry" className="mb-2 block text-sm font-medium">{kind === "website" ? (fr ? "Site Web de votre entreprise" : "Business website") : (fr ? "Nom de votre entreprise" : "Business name")}</label>
          <Input id="contractor-entry" value={value} onChange={(event) => { setValue(event.target.value); setError(false); }} inputMode={kind === "website" ? "url" : "text"} placeholder={kind === "website" ? "votre-entreprise.ca" : (fr ? "Nom de votre entreprise" : "Your business name")} className="h-12" maxLength={kind === "website" ? 500 : 160} aria-invalid={error} aria-describedby={error ? "contractor-entry-error" : undefined} />
          {error && <p id="contractor-entry-error" role="alert" className="mt-2 text-sm text-destructive">{fr ? (kind === "website" ? "Entrez l’adresse d’un site Web public, ou commencez avec votre nom d’entreprise." : "Entrez le nom de votre entreprise.") : (kind === "website" ? "Enter a public website address, or start with your business name." : "Enter your business name.")}</p>}
          <Button type="submit" size="lg" className="mt-3 h-auto min-h-14 w-full gap-2 whitespace-normal px-3 text-base font-semibold">
            {fr ? "Préparer mon profil UNPRO" : "Prepare my UNPRO profile"}<ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
          </Button>
          <Button type="button" variant="link" className="mt-2 h-auto min-h-11 w-full whitespace-normal text-sm" onClick={() => { setKind(kind === "website" ? "name" : "website"); setValue(""); setError(false); }}>
            {kind === "website" ? (fr ? "Pas de site Web? Commencez avec le nom de votre entreprise." : "No website? Start with your business name.") : (fr ? "Commencer avec mon site Web" : "Start with my website")}
          </Button>
        </form>
        <p className="mt-6 text-sm text-muted-foreground">{fr ? "Rénovation · Construction · Entretien · Services immobiliers" : "Renovation · Construction · Maintenance · Real estate services"}</p>
      </div>
    </section>
  );
}
