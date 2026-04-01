/**
 * UNPRO — CardVerifiedReview
 * Displays a single verified review with proof badge.
 */
import { Star } from "lucide-react";
import BadgeReviewVerified from "./BadgeReviewVerified";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  reviewerName: string;
  service: string;
  content: string;
  rating: number;
  date: string;
  verificationStatus: "pending" | "verified" | "rejected";
  proofType?: string;
}

export default function CardVerifiedReview({
  reviewerName,
  service,
  content,
  rating,
  date,
  verificationStatus,
  proofType,
}: Props) {
  return (
    <div className="glass-card rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
            {reviewerName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{reviewerName}</p>
            <p className="text-[10px] text-muted-foreground">{service}</p>
          </div>
        </div>
        <BadgeReviewVerified status={verificationStatus} />
      </div>

      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-3.5 w-3.5 ${
              i < rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"
            }`}
          />
        ))}
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{content}</p>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{format(new Date(date), "d MMM yyyy", { locale: fr })}</span>
        {proofType && proofType !== "none" && (
          <span className="text-emerald-400">
            Preuve: {proofType === "booking" ? "Réservation" : proofType === "invoice" ? "Facture" : "Photo"}
          </span>
        )}
      </div>
    </div>
  );
}
