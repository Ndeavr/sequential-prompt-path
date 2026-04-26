/**
 * MissingFieldPromptAlex — Alex asks for ONE missing profile field at a time.
 * Premium dark glass card with a single input + "Enregistrer".
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles } from "lucide-react";
import {
  FIELD_LABEL_FR,
  type BookingProfileField,
} from "@/hooks/useProfileCompletionGate";

interface Props {
  field: BookingProfileField;
  saving?: boolean;
  onSave: (value: string) => Promise<void> | void;
}

const PROMPT_FR: Record<BookingProfileField, string> = {
  full_name:
    "Il me manque seulement votre nom complet pour confirmer le rendez-vous.",
  phone:
    "Il me manque seulement votre numéro de téléphone pour confirmer le rendez-vous.",
  project_address:
    "Il me manque seulement l'adresse du projet pour confirmer le rendez-vous.",
};

const PLACEHOLDER_FR: Record<BookingProfileField, string> = {
  full_name: "Prénom et nom",
  phone: "514 555-0123",
  project_address: "123 rue Exemple, Montréal",
};

const INPUT_TYPE: Record<BookingProfileField, string> = {
  full_name: "text",
  phone: "tel",
  project_address: "text",
};

export default function MissingFieldPromptAlex({ field, saving, onSave }: Props) {
  const [value, setValue] = useState("");
  const minLen = field === "phone" ? 7 : field === "project_address" ? 4 : 2;
  const canSave = value.trim().length >= minLen && !saving;

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-xl p-5 space-y-4">
      <div className="flex items-start gap-2">
        <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-400/30 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-sky-300" />
        </div>
        <p className="text-[14px] text-white leading-snug">{PROMPT_FR[field]}</p>
      </div>

      <Input
        autoFocus
        type={INPUT_TYPE[field]}
        placeholder={PLACEHOLDER_FR[field]}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label={FIELD_LABEL_FR[field]}
        className="bg-white/5 border-white/10 text-white placeholder:text-white/40 h-12 rounded-xl"
      />

      <Button
        disabled={!canSave}
        onClick={() => onSave(value.trim())}
        className="w-full h-11 rounded-xl text-[14px] font-semibold bg-gradient-to-r from-[hsl(220_100%_55%)] to-[hsl(207_100%_60%)] text-white disabled:opacity-50"
      >
        {saving ? "Enregistrement…" : "Enregistrer et continuer"}
      </Button>
    </div>
  );
}
