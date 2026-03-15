/**
 * UNPRO — VerificationResultsPanel
 * Displays the full verification output: scores, summary, strengths, risks, etc.
 */
import { motion } from "framer-motion";
import { useState } from "react";
import {
  ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, XCircle,
  ChevronDown, ChevronUp, Info, ArrowRight, Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import VerificationScoreRing from "./VerificationScoreRing";
import type { VerificationOutput, IdentityResolutionStatus } from "@/types/verification";

const STATUS_CONFIG: Record<IdentityResolutionStatus, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  verified_internal_profile: { label: "Profil vérifié UNPRO", icon: ShieldCheck, color: "text-success", bg: "bg-success/5 border-success/20" },
  verified_match: { label: "Correspondance confirmée", icon: CheckCircle2, color: "text-success", bg: "bg-success/5 border-success/20" },
  probable_match_needs_more_proof: { label: "Correspondance probable", icon: AlertTriangle, color: "text-warning", bg: "bg-warning/5 border-warning/20" },
  ambiguous_match: { label: "Correspondance ambiguë", icon: ShieldAlert, color: "text-warning", bg: "bg-warning/5 border-warning/20" },
  no_reliable_match: { label: "Aucune correspondance fiable", icon: XCircle, color: "text-destructive", bg: "bg-destructive/5 border-destructive/20" },
};

interface Props {
  output: VerificationOutput;
  onUploadEvidence?: () => void;
}

export default function VerificationResultsPanel({ output, onUploadEvidence }: Props) {
  const [showDetails, setShowDetails] = useState(false);
  const { identity_resolution, internal_profile, verification, scores, strengths, risks, inconsistencies, missing_proofs, recommended_next_inputs, final_recommendation } = output;

  const statusCfg = STATUS_CONFIG[identity_resolution.status];
  const StatusIcon = statusCfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-5"
    >
      {/* Admin verified badge */}
      {internal_profile.admin_verified && internal_profile.used_admin_verified_profile && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3 p-4 rounded-xl bg-success/5 border border-success/20"
        >
          <ShieldCheck className="w-5 h-5 text-success shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">Profil vérifié par l'équipe UNPRO</p>
            <p className="text-xs text-muted-foreground">
              Cet entrepreneur a été validé manuellement. Score interne : {internal_profile.internal_verified_score}/100
            </p>
          </div>
        </motion.div>
      )}

      {/* Status + Scores */}
      <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 md:p-6">
        {/* Status badge */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold mb-5 ${statusCfg.bg} ${statusCfg.color}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          {statusCfg.label}
        </div>

        {/* Score rings */}
        <div className="flex justify-center gap-6 md:gap-10 mb-5">
          <VerificationScoreRing score={scores.identity_confidence_score} label="Identité" size={96} />
          <VerificationScoreRing score={scores.public_trust_score} label="Confiance" size={96} />
          {scores.internal_verified_score !== null && (
            <VerificationScoreRing score={scores.internal_verified_score} label="Interne" size={96} />
          )}
        </div>

        {/* Live delta */}
        {scores.live_risk_delta !== null && Math.abs(scores.live_risk_delta) >= 5 && (
          <div className={`text-center text-xs font-medium mb-4 ${scores.live_risk_delta < 0 ? "text-destructive" : "text-success"}`}>
            Delta de risque : {scores.live_risk_delta > 0 ? "+" : ""}{scores.live_risk_delta} pts
            {scores.live_risk_delta < -10 && " ⚠️ Divergence significative"}
          </div>
        )}

        <Separator className="my-4" />

        {/* Summary */}
        <p className="text-sm text-foreground leading-relaxed">{final_recommendation}</p>
      </div>

      {/* Matched entity */}
      {identity_resolution.matched_entity.business_name && (
        <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Entité identifiée</h3>
          <div className="space-y-2">
            {[
              { label: "Entreprise", value: identity_resolution.matched_entity.business_name },
              { label: "Nom légal", value: identity_resolution.matched_entity.legal_name },
              { label: "Téléphone", value: identity_resolution.matched_entity.phone },
              { label: "Site web", value: identity_resolution.matched_entity.website },
              { label: "Ville", value: identity_resolution.matched_entity.city },
              { label: "RBQ", value: identity_resolution.matched_entity.rbq_number },
              { label: "NEQ", value: identity_resolution.matched_entity.neq },
            ].map(row => (
              <div key={row.label} className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground w-24 shrink-0 text-xs">{row.label}</span>
                <span className={`font-medium ${row.value ? "text-foreground" : "text-muted-foreground/40 italic"}`}>
                  {row.value || "Non confirmé"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strengths */}
      {strengths.length > 0 && (
        <div className="rounded-2xl border border-success/20 bg-success/5 p-5">
          <h3 className="text-xs font-semibold text-success uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Points forts
          </h3>
          <ul className="space-y-1.5">
            {strengths.map((s, i) => (
              <li key={i} className="text-sm text-foreground flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risks */}
      {risks.length > 0 && (
        <div className="rounded-2xl border border-warning/20 bg-warning/5 p-5">
          <h3 className="text-xs font-semibold text-warning uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Signaux d'attention
          </h3>
          <ul className="space-y-1.5">
            {risks.map((r, i) => (
              <li key={i} className="text-sm text-foreground flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-warning mt-0.5 shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Inconsistencies */}
      {inconsistencies.length > 0 && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5">
          <h3 className="text-xs font-semibold text-destructive uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" /> Incohérences détectées
          </h3>
          <ul className="space-y-1.5">
            {inconsistencies.map((inc, i) => (
              <li key={i} className="text-sm text-foreground flex items-start gap-2">
                <XCircle className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" />
                {inc}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Missing proofs + Next inputs */}
      {(missing_proofs.length > 0 || recommended_next_inputs.length > 0) && (
        <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5">
          {missing_proofs.length > 0 && (
            <>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> Preuves manquantes
              </h3>
              <ul className="space-y-1.5 mb-4">
                {missing_proofs.map((p, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <ArrowRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
                    {p}
                  </li>
                ))}
              </ul>
            </>
          )}
          {recommended_next_inputs.length > 0 && (
            <>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Pour améliorer la correspondance, fournissez :
              </h3>
              <div className="flex flex-wrap gap-2">
                {recommended_next_inputs.map((n, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{n}</Badge>
                ))}
              </div>
            </>
          )}

          {onUploadEvidence && (
            <Button onClick={onUploadEvidence} variant="outline" size="sm" className="mt-4 gap-2">
              <Upload className="w-3.5 h-3.5" /> Ajouter une preuve
            </Button>
          )}
        </div>
      )}

      {/* Details accordion */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowDetails(!showDetails)}
        className="w-full gap-2 text-muted-foreground hover:text-foreground"
      >
        {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        Voir les détails du score
      </Button>

      {showDetails && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 space-y-3"
        >
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Détails de vérification</h3>
          {[
            { label: "RBQ", value: verification.rbq_status },
            { label: "NEQ", value: verification.neq_status },
            { label: "Présence web", value: verification.web_presence },
            { label: "Avis", value: verification.reviews_summary },
            { label: "Cohérence visuelle", value: verification.visual_consistency },
          ].map(row => (
            <div key={row.label} className="flex items-start gap-3 text-sm">
              <span className="text-muted-foreground w-28 shrink-0 text-xs">{row.label}</span>
              <span className="text-foreground">{row.value}</span>
            </div>
          ))}

          <Separator className="my-3" />

          <div>
            <p className="text-xs text-muted-foreground mb-1">Ce qui a été confirmé :</p>
            <ul className="space-y-1">
              {strengths.map((s, i) => <li key={i} className="text-xs text-foreground">✓ {s}</li>)}
              {strengths.length === 0 && <li className="text-xs text-muted-foreground italic">Aucun élément confirmé</li>}
            </ul>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Ce qui reste non confirmé :</p>
            <ul className="space-y-1">
              {missing_proofs.map((p, i) => <li key={i} className="text-xs text-foreground">— {p}</li>)}
              {missing_proofs.length === 0 && <li className="text-xs text-muted-foreground italic">Tout a été vérifié</li>}
            </ul>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Ce qui améliorerait la certitude :</p>
            <ul className="space-y-1">
              {recommended_next_inputs.map((n, i) => <li key={i} className="text-xs text-foreground">→ {n}</li>)}
              {recommended_next_inputs.length === 0 && <li className="text-xs text-muted-foreground italic">Aucune action requise</li>}
            </ul>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
