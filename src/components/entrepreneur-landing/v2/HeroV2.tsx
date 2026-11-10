/** Website-first entry into the existing progressive matching profile. */
import { contractorLoginPath } from "@/lib/routing/contractorAuthHandoff";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate, useLocation } from "react-router-dom";
import LanguageToggle, { useLanguage } from "@/components/ui/LanguageToggle";
import UnproLogo from "@/components/brand/UnproLogo";
import { contractorProfileEntryPath } from "@/lib/contractorProfileEntry";
import { detectContractorEntry } from "@/lib/claraContractorWorkspace";

interface Props { onTrackCta: (key: string, section: string) => void; }

export default function HeroV2({ onTrackCta }: Props) {
  const navigate = useNavigate();
  const { search } = useLocation();
  const { lang, setLang } = useLanguage();
  const fr = lang === "fr";
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  return (
    <section className="relative px-5 pb-12 pt-6">
      <div className="mx-auto mb-12 flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <UnproLogo size={92} variant="primary" tone="dark" animated={false} />
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
          const entry = detectContractorEntry(value);
          if (!entry) { setError(true); return; }
          onTrackCta("hero_prepare_profile", "hero");
          navigate(contractorProfileEntryPath(search, lang, entry));
        }}>
          <p id="contractor-entry-start" className="mb-1 text-sm font-semibold text-accent">{fr ? "Commencez ici — entrez le site Web de votre entreprise" : "Start here — enter your business website"}</p>
          <label htmlFor="contractor-entry" className="mb-2 block text-sm font-medium">{fr ? "Entrez le nom ou le site de votre entreprise. Clara prépare votre présence UNPRO." : "Enter your business name or website. Clara prepares your UNPRO presence."}</label>
          <Input id="contractor-entry" value={value} onChange={(event) => { setValue(event.target.value); setError(false); }} autoComplete="organization" placeholder={fr ? "votre-entreprise.ca ou Nom de l’entreprise" : "your-business.ca or Business name"} data-empty={value.trim() === "" ? "true" : "false"} className="contractor-entry-field h-12 text-base" maxLength={500} aria-invalid={error} aria-describedby={`contractor-entry-start ${error ? "contractor-entry-error" : "contractor-entry-hint"}`} />
          {error
            ? <p id="contractor-entry-error" role="alert" className="mt-2 text-sm text-destructive">{fr ? "Entrez le nom de votre entreprise ou l’adresse de son site Web public." : "Enter your business name or its public website address."}</p>
            : <p id="contractor-entry-hint" className="mt-2 text-sm text-muted-foreground">{fr ? "Pas de site Web? Commencez avec le nom de votre entreprise." : "No website? Start with your business name."}</p>}
          <Button type="submit" size="lg" className="mt-3 h-auto min-h-14 w-full gap-2 whitespace-normal px-3 text-base font-semibold">
            {fr ? "Préparer mon profil UNPRO" : "Prepare my UNPRO profile"}<ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
          </Button>
        </form>
        <p className="mt-6 text-sm text-muted-foreground">{fr ? "Rénovation, construction, entretien, service" : "Renovation, construction, maintenance, service"}</p>
      </div>
    </section>
  );
}
