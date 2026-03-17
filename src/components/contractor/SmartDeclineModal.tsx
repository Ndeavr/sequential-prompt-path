/**
 * UNPRO — Smart Decline Modal
 * Allows contractor to decline with intelligence: redirect, find partner, or simple refuse.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { XCircle, ArrowRightLeft, Handshake, X, AlertCircle } from "lucide-react";

interface Props {
  projectId: string;
  appointmentId?: string;
  onConfirm: (payload: { decline_type: string; reason_code?: string; reason_text?: string }) => void;
  onClose: () => void;
}

const declineOptions = [
  {
    value: "simple",
    icon: XCircle,
    label: "Refuser sans action",
    desc: "Le projet sera retiré de votre liste",
    color: "text-muted-foreground",
  },
  {
    value: "redirect",
    icon: ArrowRightLeft,
    label: "Rediriger vers un autre entrepreneur",
    desc: "UNPRO trouvera le meilleur candidat alternatif",
    color: "text-primary",
  },
  {
    value: "partner",
    icon: Handshake,
    label: "Trouver un partenaire et garder le projet",
    desc: "Gardez le contrôle en ajoutant un sous-traitant",
    color: "text-success",
  },
];

const reasonCodes = [
  { code: "out_of_scope", label: "Hors de mon champ d'expertise" },
  { code: "too_far", label: "Trop éloigné de ma zone" },
  { code: "no_capacity", label: "Pas de disponibilité" },
  { code: "budget_too_low", label: "Budget insuffisant" },
  { code: "project_unclear", label: "Projet mal défini" },
  { code: "other", label: "Autre raison" },
];

const SmartDeclineModal = ({ projectId, appointmentId, onConfirm, onClose }: Props) => {
  const [type, setType] = useState("simple");
  const [reason, setReason] = useState("");
  const [reasonText, setReasonText] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-card border border-border/40 rounded-2xl shadow-[var(--shadow-xl)] max-w-md w-full max-h-[85vh] overflow-y-auto p-5 space-y-5"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-warning" />
            <h2 className="text-base font-bold text-foreground">Refus intelligent</h2>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Chaque refus aide UNPRO à mieux calibrer vos futurs projets. Choisissez comment procéder.
        </p>

        {/* Decline type */}
        <RadioGroup value={type} onValueChange={setType} className="space-y-2">
          {declineOptions.map(opt => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                type === opt.value ? "border-primary/40 bg-primary/5" : "border-border/30 bg-card/30 hover:bg-card/50"
              }`}
            >
              <RadioGroupItem value={opt.value} className="mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <opt.icon className={`w-4 h-4 ${opt.color}`} />
                  <span className="text-sm font-semibold text-foreground">{opt.label}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{opt.desc}</p>
              </div>
            </label>
          ))}
        </RadioGroup>

        {/* Reason code */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-foreground">Raison du refus</Label>
          <div className="flex flex-wrap gap-1.5">
            {reasonCodes.map(rc => (
              <button
                key={rc.code}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  reason === rc.code ? "bg-primary text-primary-foreground" : "bg-muted/20 text-muted-foreground hover:bg-muted/30"
                }`}
                onClick={() => setReason(rc.code)}
              >
                {rc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Optional note */}
        {reason === "other" && (
          <Textarea
            placeholder="Précisez la raison..."
            value={reasonText}
            onChange={e => setReasonText(e.target.value)}
            className="min-h-[60px] text-xs rounded-xl bg-card/40 border-border/30"
          />
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1 rounded-xl h-10 text-xs" onClick={onClose}>
            Annuler
          </Button>
          <Button
            className="flex-1 rounded-xl h-10 text-xs font-semibold"
            onClick={() => onConfirm({ decline_type: type, reason_code: reason || undefined, reason_text: reasonText || undefined })}
            disabled={!reason}
          >
            {type === "redirect" ? "Rediriger" : type === "partner" ? "Trouver un partenaire" : "Confirmer le refus"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SmartDeclineModal;
