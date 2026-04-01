/**
 * UNPRO — SectionTrustProof
 * Inline trust proof section for embedding in match results / contractor pages.
 * Shows 2 verified reviews + local badge + mini AI explanation.
 */
import { motion } from "framer-motion";
import { fadeUp, staggerContainer, viewportOnce } from "@/lib/motion";
import PanelAIExplainedSimple from "./PanelAIExplainedSimple";
import CardVerifiedReview from "./CardVerifiedReview";
import BadgeLocalAvailable from "./BadgeLocalAvailable";
import PanelTrustStack from "./PanelTrustStack";

interface Review {
  id: string;
  reviewerName: string;
  service: string;
  content: string;
  rating: number;
  date: string;
  verificationStatus: "pending" | "verified" | "rejected";
  proofType?: string;
}

interface Props {
  city?: string;
  reviews?: Review[];
  aippScore?: number;
  projectsCompleted?: number;
  isVerified?: boolean;
  showAIExplanation?: boolean;
}

// Fallback reviews when none provided
const FALLBACK_REVIEWS: Review[] = [
  {
    id: "f1",
    reviewerName: "Marie T.",
    service: "Plomberie",
    content: "Service rapide et professionnel. Prix exactement comme estimé.",
    rating: 5,
    date: "2026-03-15",
    verificationStatus: "verified",
    proofType: "booking",
  },
  {
    id: "f2",
    reviewerName: "Jean-François L.",
    service: "Électricité",
    content: "Excellent travail. L'entrepreneur recommandé était compétent et ponctuel.",
    rating: 5,
    date: "2026-03-10",
    verificationStatus: "verified",
    proofType: "invoice",
  },
];

export default function SectionTrustProof({
  city,
  reviews,
  aippScore,
  projectsCompleted,
  isVerified,
  showAIExplanation = false,
}: Props) {
  const displayReviews = reviews && reviews.length > 0 ? reviews.slice(0, 2) : FALLBACK_REVIEWS;

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      className="space-y-6"
    >
      {/* Trust badges row */}
      <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-3">
        <PanelTrustStack
          compact
          aippScore={aippScore}
          projectsCompleted={projectsCompleted}
          isVerified={isVerified}
          reviewCount={displayReviews.length}
        />
        {city && <BadgeLocalAvailable city={city} />}
      </motion.div>

      {/* Mini AI explanation */}
      {showAIExplanation && (
        <motion.div variants={fadeUp}>
          <PanelAIExplainedSimple variant="compact" />
        </motion.div>
      )}

      {/* 2 verified reviews */}
      <motion.div variants={fadeUp} className="grid gap-3 sm:grid-cols-2">
        {displayReviews.map((review) => (
          <CardVerifiedReview
            key={review.id}
            reviewerName={review.reviewerName}
            service={review.service}
            content={review.content}
            rating={review.rating}
            date={review.date}
            verificationStatus={review.verificationStatus}
            proofType={review.proofType}
          />
        ))}
      </motion.div>
    </motion.div>
  );
}
