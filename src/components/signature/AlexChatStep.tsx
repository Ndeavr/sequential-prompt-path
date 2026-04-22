/**
 * AlexChatStep — Collects business info step by step in a chat-like flow.
 */
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { EmailInput } from "@/components/ui/email-input";
import { WebsiteInput } from "@/components/ui/website-input";
import { cleanTextField } from "@/utils/cleanInput";

interface ContractorDraft {
  business_name: string;
  first_name: string;
  city: string;
  phone: string;
  email: string;
  activity: string;
  website?: string;
}

interface Props {
  draft: ContractorDraft;
  onUpdate: (patch: Partial<ContractorDraft>) => void;
  onComplete: () => void;
  isProcessing: boolean;
}

type FieldKey = "business_name" | "first_name" | "city" | "phone" | "email" | "activity" | "website";

const FIELDS: { key: FieldKey; label: string; placeholder: string; type?: string; required: boolean }[] = [
  { key: "business_name", label: "Nom de votre entreprise", placeholder: "Ex: Rénovation Laval Inc.", required: true },
  { key: "first_name", label: "Votre prénom", placeholder: "Ex: Marc", required: true },
  { key: "city", label: "Votre ville", placeholder: "Ex: Laval", required: true },
  { key: "phone", label: "Téléphone", placeholder: "(514) 555-0000", type: "tel", required: true },
  { key: "email", label: "Courriel professionnel", placeholder: "vous@entreprise.com", type: "email", required: true },
  { key: "activity", label: "Activité principale", placeholder: "Ex: Plomberie, Rénovation...", required: true },
  { key: "website", label: "Site web (optionnel)", placeholder: "www.votreentreprise.com", type: "url", required: false },
];

export default function AlexChatStep({ draft, onUpdate, onComplete, isProcessing }: Props) {
  const [currentField, setCurrentField] = useState(0);

  const field = FIELDS[currentField];
  const isLast = currentField >= FIELDS.length - 1;
  const value = draft[field.key] || "";

  const canProceed = !field.required || value.trim().length > 0;

  const handleNext = useCallback(() => {
    // Clean text fields on advance
    if (field.type !== "tel" && field.type !== "email" && field.type !== "url") {
      onUpdate({ [field.key]: cleanTextField(value) });
    }
    if (isLast) {
      onComplete();
    } else {
      setCurrentField((i) => i + 1);
    }
  }, [isLast, onComplete, field, value, onUpdate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && canProceed) handleNext();
    },
    [canProceed, handleNext]
  );

  const renderInput = () => {
    if (field.type === "tel") {
      return (
        <PhoneInput
          placeholder={field.placeholder}
          value={value}
          onChange={(v) => onUpdate({ [field.key]: v })}
          onKeyDown={handleKeyDown}
          autoFocus
          className="h-12 text-base rounded-xl"
        />
      );
    }
    if (field.type === "email") {
      return (
        <EmailInput
          placeholder={field.placeholder}
          value={value}
          onChange={(v) => onUpdate({ [field.key]: v })}
          onKeyDown={handleKeyDown}
          autoFocus
          className="h-12 text-base rounded-xl"
          showValidation
        />
      );
    }
    if (field.type === "url") {
      return (
        <WebsiteInput
          placeholder={field.placeholder}
          value={value}
          onChange={(v) => onUpdate({ [field.key]: v })}
          onKeyDown={handleKeyDown}
          autoFocus
          className="h-12 text-base rounded-xl"
        />
      );
    }
    return (
      <Input
        type="text"
        placeholder={field.placeholder}
        value={value}
        onChange={(e) => onUpdate({ [field.key]: e.target.value })}
        onBlur={() => onUpdate({ [field.key]: cleanTextField(value) })}
        onKeyDown={handleKeyDown}
        autoFocus
        className="h-12 text-base rounded-xl"
      />
    );
  };

  return (
    <div className="space-y-6">
      {/* Already answered fields */}
      <div className="space-y-2">
        {FIELDS.slice(0, currentField).map((f) => (
          <motion.div
            key={f.key}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-muted/30 border border-border/20"
          >
            <span className="text-xs text-muted-foreground">{f.label}</span>
            <span className="text-sm font-medium text-foreground">{draft[f.key] || "—"}</span>
          </motion.div>
        ))}
      </div>

      {/* Current field */}
      <AnimatePresence mode="wait">
        <motion.div
          key={field.key}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          className="space-y-3"
        >
          <label className="text-sm font-semibold text-foreground">{field.label}</label>
          {renderInput()}
        </motion.div>
      </AnimatePresence>

      {/* Progress + CTA */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-muted-foreground">
          {currentField + 1}/{FIELDS.length}
        </span>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={!canProceed || isProcessing}
          onClick={handleNext}
          className="h-11 px-6 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              {isLast ? "Créer mon profil" : "Suivant"}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}
