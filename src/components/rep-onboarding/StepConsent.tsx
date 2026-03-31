import { motion } from "framer-motion";
import { Shield, Loader2 } from "lucide-react";
import type { ImportMode } from "@/pages/recruitment/PageRepresentativeOnboarding";

interface Props {
  mode: ImportMode;
  repName: string;
  consents: { data_structuring: boolean; manual_validation: boolean; secure_link: boolean };
  onUpdate: (patch: Partial<Props["consents"]>) => void;
  onAccept: () => void;
  isProcessing: boolean;
}

const CONSENT_ITEMS: { key: keyof Props["consents"]; text: string }[] = [
  { key: "data_structuring", text: "J'autorise UNPRO à structurer les informations publiques de cette entreprise pour générer un profil privé." },
  { key: "manual_validation", text: "J'accepte que certaines données puissent nécessiter une validation manuelle avant affichage public." },
  { key: "secure_link", text: "J'accepte de recevoir le lien sécurisé du profil privé par email ou SMS." },
];

export default function StepConsent({ mode, repName, consents, onUpdate, onAccept, isProcessing }: Props) {
  const allAccepted = consents.data_structuring && consents.manual_validation && consents.secure_link;

  return (
    <div className="space-y-5">
      {mode === "representative_import" && repName && (
        <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 flex items-center gap-3">
          <Shield className="w-5 h-5 text-primary flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-foreground">Représentant UNPRO</p>
            <p className="text-xs text-muted-foreground">{repName}</p>
          </div>
        </div>
      )}

      <h2 className="text-lg font-bold text-foreground">Consentement</h2>
      <p className="text-sm text-muted-foreground">
        {mode === "representative_import"
          ? "Obtenez l'accord de l'entrepreneur avant de lancer l'import."
          : "Votre accord est requis avant de structurer vos données publiques."}
      </p>

      <div className="space-y-3">
        {CONSENT_ITEMS.map((item) => (
          <label
            key={item.key}
            className="flex items-start gap-3 rounded-xl border border-border/40 bg-card p-4 cursor-pointer hover:border-primary/30 transition-colors"
          >
            <input
              type="checkbox"
              checked={consents[item.key]}
              onChange={(e) => onUpdate({ [item.key]: e.target.checked })}
              className="mt-0.5 w-4 h-4 rounded border-border text-primary focus:ring-primary/30"
            />
            <span className="text-xs text-foreground leading-relaxed">{item.text}</span>
          </label>
        ))}
      </div>

      <div className="text-center text-[10px] text-muted-foreground/60">
        Aucune publication automatique sans validation. Profil privé d'abord, public ensuite.
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onAccept}
        disabled={!allAccepted || isProcessing}
        className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-base shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
        {isProcessing ? "Enregistrement..." : "Lancer l'import"}
      </motion.button>
    </div>
  );
}
