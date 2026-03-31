import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import type { ImportMode, SeedData } from "@/pages/recruitment/PageRepresentativeOnboarding";

interface Props {
  seed: SeedData;
  mode: ImportMode;
  onUpdate: (patch: Partial<SeedData>) => void;
  onContinue: () => void;
  isProcessing: boolean;
}

function formatPhone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

const INPUT_CLS = "w-full h-12 rounded-xl bg-muted/50 border border-border/40 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all";

export default function StepSeedCapture({ seed, mode, onUpdate, onContinue, isProcessing }: Props) {
  const hasIdentifier = seed.business_name || seed.website || seed.google_business_url || seed.phone;

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-foreground">
        {mode === "representative_import" ? "Informations de l'entrepreneur" : "Vos informations"}
      </h2>

      <div className="space-y-3">
        {mode === "representative_import" && (
          <input
            type="text"
            placeholder="Votre nom (représentant)"
            value={seed.rep_name}
            onChange={(e) => onUpdate({ rep_name: e.target.value })}
            className={INPUT_CLS}
          />
        )}

        <input
          type="text"
          placeholder="Nom de l'entreprise *"
          value={seed.business_name}
          onChange={(e) => onUpdate({ business_name: e.target.value })}
          className={INPUT_CLS}
        />

        <input
          type="text"
          placeholder="Nom du contact"
          value={seed.contact_name}
          onChange={(e) => onUpdate({ contact_name: e.target.value })}
          className={INPUT_CLS}
        />

        <input
          type="url"
          placeholder="Site web"
          value={seed.website}
          onChange={(e) => onUpdate({ website: e.target.value })}
          className={INPUT_CLS}
        />

        <input
          type="url"
          placeholder="Lien Google Business"
          value={seed.google_business_url}
          onChange={(e) => onUpdate({ google_business_url: e.target.value })}
          className={INPUT_CLS}
        />

        <input
          type="tel"
          placeholder="Téléphone"
          value={seed.phone}
          onChange={(e) => onUpdate({ phone: formatPhone(e.target.value) })}
          className={INPUT_CLS}
        />

        <input
          type="email"
          placeholder="Email"
          value={seed.email}
          onChange={(e) => onUpdate({ email: e.target.value })}
          className={INPUT_CLS}
        />

        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="RBQ (optionnel)"
            value={seed.rbq_number}
            onChange={(e) => onUpdate({ rbq_number: e.target.value })}
            className={INPUT_CLS}
          />
          <input
            type="text"
            placeholder="NEQ (optionnel)"
            value={seed.neq_number}
            onChange={(e) => onUpdate({ neq_number: e.target.value })}
            className={INPUT_CLS}
          />
        </div>
      </div>

      {!hasIdentifier && (
        <p className="text-xs text-amber-400 text-center">
          Ajoutez au moins un élément : nom d'entreprise, site web, fiche Google ou téléphone.
        </p>
      )}

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onContinue}
        disabled={!hasIdentifier || isProcessing}
        className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-base shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
        {isProcessing ? "Création..." : "Continuer"}
      </motion.button>

      <button
        onClick={onContinue}
        disabled={isProcessing}
        className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
      >
        Je n'ai pas toutes les infos →
      </button>
    </div>
  );
}
