import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { CLARA_QUALIFICATION_UPDATED_EVENT, getClaraQualification, saveClaraQualification, type ClaraContractorQualification } from "@/services/clara/claraContractorQualification";

const FIELDS = [
  ["primary_trade", "Métier"], ["service_areas", "Territoires desservis"],
  ["preferred_work", "Travaux préférés"], ["excluded_work", "Mandats à éviter"], ["excluded_areas", "Territoires exclus"],
  ["preferred_project_sizes", "Taille des contrats"], ["preferred_duration", "Durée préférée"],
  ["availability", "Disponibilité"],
] as const;
export default function ClaraQualificationPreview({ onConfirm }: { onConfirm?: () => void }) {
  const [known, setKnown] = useState(getClaraQualification);
  useEffect(() => {
    const update = () => setKnown(getClaraQualification());
    window.addEventListener(CLARA_QUALIFICATION_UPDATED_EVENT, update);
    return () => window.removeEventListener(CLARA_QUALIFICATION_UPDATED_EVENT, update);
  }, []);
  if (!known.preferences_captured && !known.preferred_work?.length && !known.excluded_areas?.length && !known.preferred_project_sizes?.length) return null;
  return <article className="home-clara-card home-clara-qualification-preview" aria-label="Votre profil se construit">
    <p className="home-clara-card-title">Voici ce que j’ai compris</p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {FIELDS.map(([key, label]) => {
        const value = known[key];
        if (!value || (Array.isArray(value) && !value.length)) return null;
        return <div key={key} className="motion-safe:animate-in motion-safe:fade-in">
          <label className="text-xs text-muted-foreground" htmlFor={`clara-criterion-${key}`}>{label} · {known.provenance?.[key] === "public" ? "Source publique" : known.provenance?.[key] === "inferred" ? "À confirmer" : "Déclaré"}</label>
          <Input id={`clara-criterion-${key}`} value={Array.isArray(value) ? value.join(", ") : value} onChange={event => {
            const patch: ClaraContractorQualification = { preferences_confirmed: false };
            const text = event.target.value;
            if (["service_areas", "preferred_work", "excluded_work", "excluded_areas", "preferred_project_sizes"].includes(key)) (patch as Record<string, unknown>)[key] = text.split(",").map(item => item.trim()).filter(Boolean);
            else (patch as Record<string, unknown>)[key] = text;
            saveClaraQualification(patch, "declared", { replaceLists: true });
          }} />
        </div>;
      })}
    </div>
    {onConfirm && <button type="button" className="home-clara-card-primary mt-3" onClick={() => { saveClaraQualification({ preferences_confirmed: true }); onConfirm(); }}>C’est bien ça</button>}
  </article>;
}
