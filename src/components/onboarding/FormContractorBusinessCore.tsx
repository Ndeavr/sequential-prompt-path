/**
 * UNPRO — Contractor Business Core Form (onboarding)
 * Préremplie depuis compte/profil/fiche/Clara ; choix guidés pour métier,
 * villes desservies et taille d'équipe. Seuls les champs manquants sont requis.
 */
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";
import { EmailInput } from "@/components/ui/email-input";
import { WebsiteInput } from "@/components/ui/website-input";
import { cleanTextField } from "@/utils/cleanInput";
import { PROJECT_TRADE_CATEGORIES } from "@/lib/offers/projectTrades";
import { SEO_CITIES } from "@/seo/data/cities";

export const TEAM_SIZE_OPTIONS = ["Seul", "2 à 5", "6 à 15", "16 et plus"];
const POPULAR_CITIES = SEO_CITIES.slice(0, 24).map((c) => c.name);

export interface ContractorBusinessData {
  company_name: string;
  email: string;
  phone: string;
  website: string;
  main_category: string;
  service_areas: string[];
  team_size: string;
}

interface Props {
  initialData?: Partial<ContractorBusinessData>;
  onSave: (data: ContractorBusinessData) => void;
  loading?: boolean;
}

const chip = (on: boolean) =>
  `min-h-[44px] px-3 rounded-full text-sm border transition-colors ${
    on ? "border-primary bg-primary/10 text-primary font-medium" : "border-border bg-card text-foreground"
  }`;

export default function FormContractorBusinessCore({ initialData, onSave, loading }: Props) {
  const [form, setForm] = useState<ContractorBusinessData>({
    company_name: initialData?.company_name || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    website: initialData?.website || "",
    main_category: initialData?.main_category || "",
    service_areas: initialData?.service_areas ?? [],
    team_size: initialData?.team_size || "",
  });
  const [cityDraft, setCityDraft] = useState("");
  // Champs déjà connus : affichés en résumé, modifiables sur demande.
  const [known] = useState(() => ({
    company_name: !!initialData?.company_name,
    email: !!initialData?.email,
    phone: !!initialData?.phone,
    website: !!initialData?.website,
  }));
  const [editKnown, setEditKnown] = useState(false);

  const update = <K extends keyof ContractorBusinessData>(k: K, v: ContractorBusinessData[K]) =>
    setForm((p) => ({ ...p, [k]: v }));
  const toggleCity = (c: string) =>
    update("service_areas", form.service_areas.includes(c) ? form.service_areas.filter((x) => x !== c) : [...form.service_areas, c]);
  const addCity = () => {
    const c = cleanTextField(cityDraft);
    if (c && !form.service_areas.includes(c)) update("service_areas", [...form.service_areas, c]);
    setCityDraft("");
  };

  const isValid = form.company_name.trim() && form.email.trim() && form.main_category && form.service_areas.length > 0;
  const showField = (k: keyof typeof known) => editKnown || !known[k];
  const knownSummary = (Object.keys(known) as (keyof typeof known)[]).filter((k) => known[k]);
  const cityChoices = Array.from(new Set([...form.service_areas, ...POPULAR_CITIES]));

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground">Votre entreprise</h2>
        <p className="text-sm text-muted-foreground mt-1">Complétez seulement ce qui manque</p>
      </div>

      {knownSummary.length > 0 && !editKnown && (
        <div className="rounded-xl border border-border bg-card p-3 text-sm space-y-1">
          {form.company_name && <p className="font-medium text-foreground">{form.company_name}</p>}
          {form.email && <p className="text-muted-foreground">{form.email}</p>}
          {form.phone && <p className="text-muted-foreground">{form.phone}</p>}
          {form.website && <p className="text-muted-foreground">{form.website}</p>}
          <button type="button" onClick={() => setEditKnown(true)} className="text-primary text-sm underline-offset-4 hover:underline">
            Modifier
          </button>
        </div>
      )}

      <div className="space-y-3">
        {showField("company_name") && (
          <Input placeholder="Nom de l'entreprise *" value={form.company_name}
            onChange={(e) => update("company_name", e.target.value)}
            onBlur={() => update("company_name", cleanTextField(form.company_name))} className="h-11 rounded-xl" />
        )}
        {showField("email") && (
          <EmailInput placeholder="Courriel *" value={form.email} onChange={(v) => update("email", v)} className="h-11 rounded-xl" showValidation />
        )}
        {showField("phone") && (
          <PhoneInput placeholder="Téléphone" value={form.phone} onChange={(v) => update("phone", v)} className="h-11 rounded-xl" />
        )}
        {showField("website") && (
          <WebsiteInput placeholder="Site web" value={form.website} onChange={(v) => update("website", v)} className="h-11 rounded-xl" />
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground">Votre métier principal *</p>
        <div className="flex flex-wrap gap-2">
          {PROJECT_TRADE_CATEGORIES.map((t) => (
            <button key={t.slug} type="button" className={chip(form.main_category === t.name_fr)} onClick={() => update("main_category", t.name_fr)}>
              {t.name_fr}
            </button>
          ))}
          {form.main_category && !PROJECT_TRADE_CATEGORIES.some((t) => t.name_fr === form.main_category) && (
            <button type="button" className={chip(true)}>{form.main_category}</button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground">Villes desservies *</p>
        <div className="flex flex-wrap gap-2">
          {cityChoices.map((c) => (
            <button key={c} type="button" className={chip(form.service_areas.includes(c))} onClick={() => toggleCity(c)}>{c}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input placeholder="Autre ville" value={cityDraft} onChange={(e) => setCityDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCity(); } }} className="h-11 rounded-xl" />
          <Button type="button" variant="outline" onClick={addCity} className="h-11 rounded-xl">Ajouter</Button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground">Taille de l'équipe</p>
        <div className="grid grid-cols-2 gap-2">
          {TEAM_SIZE_OPTIONS.map((s) => (
            <button key={s} type="button" className={chip(form.team_size === s)} onClick={() => update("team_size", s)}>{s}</button>
          ))}
        </div>
      </div>

      <Button onClick={() => onSave(form)} disabled={!isValid || loading} className="w-full h-11 rounded-xl">
        {loading ? "Enregistrement…" : "Continuer"}
      </Button>
    </div>
  );
}
