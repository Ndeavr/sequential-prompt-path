/**
 * VerificationResultsLayout — Composes all verification result components
 * into a responsive layout: stacked on mobile, grid on desktop.
 */
import { motion } from "framer-motion";
import type { VerificationOutput } from "@/types/verification";
import ContractorVerificationScore from "./ContractorVerificationScore";
import UnproTrustScoreCard from "./UnproTrustScoreCard";
import VerifiedByUnproBadge from "./VerifiedByUnproBadge";
import VerificationSummaryCard from "./VerificationSummaryCard";
import StrengthsCard from "./StrengthsCard";
import RisksCard from "./RisksCard";
import InconsistenciesCard from "./InconsistenciesCard";
import MissingProofsCard from "./MissingProofsCard";
import ScoreDetailsDrawer from "./ScoreDetailsDrawer";

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-5"
    >
      {/* Admin verified badge */}
      <VerifiedByUnproBadge
        adminVerified={internal_profile.admin_verified}
        internalVerifiedScore={internal_profile.internal_verified_score}
        internalVerifiedAt={internal_profile.internal_verified_at}
        loading={loading}
      />

      {/* Scores row: main gauge + trust card side by side on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
        <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 flex justify-center">
          <ContractorVerificationScore
            score={scores.identity_confidence_score}
            loading={loading}
          />
        </div>
        <div className="space-y-4">
          <UnproTrustScoreCard score={scores.public_trust_score} loading={loading} />

          {/* Live risk delta */}
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
              {scores.live_risk_delta < -10 && " ⚠️ Divergence significative"}
            </motion.div>
          )}
        </div>
      </div>

      {/* Summary */}
      <VerificationSummaryCard
        finalRecommendation={final_recommendation}
        identitySummary={identity_resolution.summary}
        loading={loading}
      />

      {/* Signal cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StrengthsCard strengths={strengths} loading={loading} />
        <RisksCard risks={risks} loading={loading} />
      </div>

      <InconsistenciesCard inconsistencies={inconsistencies} loading={loading} />

      <MissingProofsCard
        missingProofs={missing_proofs}
        recommendedNextInputs={recommended_next_inputs}
        identityConfidenceScore={scores.identity_confidence_score}
        onUploadEvidence={onUploadEvidence}
        loading={loading}
      />

      {/* Score details drawer */}
      <ScoreDetailsDrawer
        verification={verification}
        strengths={strengths}
        missingProofs={missing_proofs}
        recommendedNextInputs={recommended_next_inputs}
      />

      {/* Footer trust text */}
      <p className="text-[11px] text-center text-muted-foreground/60 leading-relaxed max-w-md mx-auto">
        UnPRO n'invente jamais les données manquantes. En cas d'ambiguïté, nous demandons plus de preuves plutôt que de deviner.
      </p>
    </motion.div>
  );
}
