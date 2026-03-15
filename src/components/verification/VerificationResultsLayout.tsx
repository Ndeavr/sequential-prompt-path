/**
 * VerificationResultsLayout — Composes all verification result components.
 *
 * Product rules enforced:
 * - Admin verified profile shown first as primary trust source
 * - Divergence between internal/public gets careful wording
 * - Context-aware microcopy per status
 * - Scores are explicitly marked as estimative
 */
import { motion } from "framer-motion";
import { AlertTriangle, Info, Shield } from "lucide-react";
import type { VerificationOutput, IdentityResolutionStatus } from "@/types/verification";
import ContractorVerificationScore from "./ContractorVerificationScore";
import UnproTrustScoreCard from "./UnproTrustScoreCard";
import VerifiedByUnproBadge from "./VerifiedByUnproBadge";
import VerificationSummaryCard from "./VerificationSummaryCard";
import StrengthsCard from "./StrengthsCard";
import RisksCard from "./RisksCard";
import InconsistenciesCard from "./InconsistenciesCard";
import MissingProofsCard from "./MissingProofsCard";
import ScoreDetailsDrawer from "./ScoreDetailsDrawer";

/** Status-specific microcopy — anti-hallucination wording */
const STATUS_MICROCOPY: Record<IdentityResolutionStatus, { text: string; tone: "success" | "warning" | "destructive" | "muted" }> = {
  verified_internal_profile: {
    text: "Bonne nouvelle : nous avons pu relier ces données à un profil vérifié en interne par l'équipe UnPRO.",
    tone: "success",
  },
  verified_match: {
    text: "Bonne nouvelle : nous avons pu relier ces données à une entreprise cohérente selon les informations publiques disponibles.",
    tone: "success",
  },
  probable_match_needs_more_proof: {
    text: "Une correspondance probable a été identifiée. Ajoutez 1 à 3 éléments complémentaires pour confirmer l'identité.",
    tone: "warning",
  },
  ambiguous_match: {
    text: "Nous avons trouvé plusieurs correspondances possibles. Pour éviter toute erreur, ajoutez 1 à 3 éléments complémentaires.",
    tone: "warning",
  },
  no_reliable_match: {
    text: "Aucune entreprise n'a pu être reliée à ces données de façon suffisamment fiable. Cet entrepreneur n'est peut-être pas encore répertorié.",
    tone: "destructive",
  },
};

const TONE_STYLES = {
  success: "border-success/20 bg-success/5 text-success",
  warning: "border-warning/20 bg-warning/5 text-warning",
  destructive: "border-destructive/20 bg-destructive/5 text-destructive",
  muted: "border-border/40 bg-muted/5 text-muted-foreground",
};

interface Props {
  output: VerificationOutput;
  onUploadEvidence?: () => void;
  loading?: boolean;
}

export default function VerificationResultsLayout({ output, onUploadEvidence, loading }: Props) {
  const {
    identity_resolution,
    internal_profile,
    verification,
    scores,
    strengths,
    risks,
    inconsistencies,
    missing_proofs,
    recommended_next_inputs,
    final_recommendation,
  } = output;

  const status = identity_resolution.status;
  const microcopy = STATUS_MICROCOPY[status];
  const hasDivergence = scores.live_risk_delta != null && scores.live_risk_delta < -10;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-5"
      role="region"
      aria-label="Résultats de vérification"
    >
      {/* 1. Admin verified badge — always shown first as primary trust source */}
      <VerifiedByUnproBadge
        adminVerified={internal_profile.admin_verified}
        internalVerifiedScore={internal_profile.internal_verified_score}
        internalVerifiedAt={internal_profile.internal_verified_at}
        loading={loading}
      />

      {/* 2. Status microcopy — contextual message */}
      {microcopy && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl border p-3.5 text-sm leading-relaxed ${TONE_STYLES[microcopy.tone]}`}
        >
          <div className="flex items-start gap-2.5">
            {microcopy.tone === "success" ? (
              <Shield className="w-4 h-4 mt-0.5 shrink-0" />
            ) : microcopy.tone === "destructive" ? (
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            ) : (
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
            )}
            <span>{microcopy.text}</span>
          </div>
        </motion.div>
      )}

      {/* 3. Divergence warning — careful wording when internal ≠ public */}
      {hasDivergence && internal_profile.admin_verified && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-warning/30 bg-warning/5 p-3.5 text-xs text-warning leading-relaxed"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Certaines données publiques récentes diffèrent du profil validé en interne.
              Notre équipe peut réviser ce dossier si nécessaire.
            </span>
          </div>
        </motion.div>
      )}

      {/* 4. Scores: main gauge + trust card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
        <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 flex justify-center">
          <ContractorVerificationScore
            score={scores.identity_confidence_score}
            loading={loading}
          />
        </div>
        <div className="space-y-4">
          <UnproTrustScoreCard score={scores.public_trust_score} loading={loading} />

          {/* Live risk delta — only show when significant */}
          {scores.live_risk_delta != null && Math.abs(scores.live_risk_delta) >= 5 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`rounded-xl border p-3 text-center text-xs font-medium ${
                scores.live_risk_delta < 0
                  ? "border-destructive/20 bg-destructive/5 text-destructive"
                  : "border-success/20 bg-success/5 text-success"
              }`}
            >
              Delta de risque : {scores.live_risk_delta > 0 ? "+" : ""}{scores.live_risk_delta} pts
              {scores.live_risk_delta < -10 && " — divergence significative détectée"}
            </motion.div>
          )}
        </div>
      </div>

      {/* 5. Summary */}
      <VerificationSummaryCard
        finalRecommendation={final_recommendation}
        identitySummary={identity_resolution.summary}
        loading={loading}
      />

      {/* 6. Signal cards — strengths & risks side by side on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StrengthsCard strengths={strengths} loading={loading} />
        <RisksCard risks={risks} loading={loading} />
      </div>

      {/* 7. Inconsistencies — shown even when empty for transparency */}
      <InconsistenciesCard inconsistencies={inconsistencies} loading={loading} />

      {/* 8. Missing proofs — prominent when score < 60 */}
      <MissingProofsCard
        missingProofs={missing_proofs}
        recommendedNextInputs={recommended_next_inputs}
        identityConfidenceScore={scores.identity_confidence_score}
        onUploadEvidence={onUploadEvidence}
        loading={loading}
      />

      {/* 9. Score details */}
      <ScoreDetailsDrawer
        verification={verification}
        strengths={strengths}
        missingProofs={missing_proofs}
        recommendedNextInputs={recommended_next_inputs}
      />

      {/* 10. Estimative disclaimer */}
      <div className="rounded-xl border border-border/30 bg-muted/20 p-3 text-center">
        <p className="text-[11px] text-muted-foreground/60 leading-relaxed max-w-md mx-auto">
          Ces scores sont estimatifs, basés sur les données publiques détectées au moment de l'analyse.
          Ils ne constituent pas une certification légale ni une garantie de fiabilité.
          UnPRO n'invente jamais les données manquantes.
        </p>
      </div>
    </motion.div>
  );
}
