/**
 * FormProjectFallbackAdaptive — Intelligent fallback form.
 * Appears as a bottom-sheet drawer, pre-filled with Alex context data.
 * NOT shown by default. Only activated after voice + chat fail.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Camera, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";

const PROJECT_TYPES = [
  "Toiture", "Isolation", "Fondation", "Plomberie", "Électricité",
  "Fenêtres", "Cuisine", "Salle de bain", "Sous-sol", "Rénovation complète", "Autre",
];

const URGENCY_OPTIONS = [
  { value: "not_urgent", label: "Pas urgent" },
  { value: "weeks", label: "Dans les prochaines semaines" },
  { value: "this_week", label: "Urgent — cette semaine" },
  { value: "immediate", label: "Urgence immédiate" },
];

interface Props {
  prefillData?: Record<string, string>;
  onSubmit?: (data: Record<string, string>) => void;
}

export default function FormProjectFallbackAdaptive({ prefillData, onSubmit }: Props) {
  const [projectType, setProjectType] = useState(prefillData?.projectType || "");
  const [city, setCity] = useState(prefillData?.city || "");
  const [description, setDescription] = useState(prefillData?.lastMessage || "");
  const [urgency, setUrgency] = useState(prefillData?.urgency || "not_urgent");

  const handleSubmit = () => {
    onSubmit?.({ projectType, city, description, urgency });
  };

  const hasAlexData = !!(prefillData?.lastMessage || prefillData?.projectType || prefillData?.city);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-lg"
    >
      {/* Alex helper banner */}
      {hasAlexData && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-primary/5 border border-primary/10 px-4 py-3">
          <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Alex a pré-rempli certains champs à partir de votre conversation.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-border/40 bg-card shadow-lg p-5 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <PenLine className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold text-foreground">Décrivez votre projet</h3>
        </div>

        {/* Project type chips */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">Type de travaux</label>
          <div className="flex flex-wrap gap-2">
            {PROJECT_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setProjectType(t)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                  projectType === t
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border hover:border-primary/40 hover:text-primary text-muted-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* City */}
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Ville</label>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Ex: Laval, Montréal..."
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">
            Décrivez votre projet ou problème
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Ex: Ma toiture coule depuis 2 semaines..."
          />
        </div>

        {/* Urgency */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">Urgence</label>
          <div className="grid grid-cols-2 gap-2">
            {URGENCY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setUrgency(opt.value)}
                className={`px-3 py-2 rounded-lg text-sm border transition-all text-left ${
                  urgency === opt.value
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border hover:border-primary/40 text-muted-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Photo zone */}
        <div className="border-2 border-dashed border-border/60 rounded-lg p-4 text-center">
          <Camera className="h-6 w-6 text-muted-foreground/40 mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">Ajoutez des photos (optionnel)</p>
        </div>

        {/* Submit */}
        <Button onClick={handleSubmit} size="lg" className="w-full gap-2 rounded-xl">
          Continuer <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
