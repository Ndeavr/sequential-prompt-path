/**
 * ReviewSignalCard — displays ONLY real, existing review signals.
 * Renders nothing when UNPRO has no grounded rating/review data.
 */
import { Star } from "lucide-react";
import type { ActivationProfile } from "../types";
import ProvenanceChip from "./ProvenanceChip";

export default function ReviewSignalCard({ profile }: { profile: ActivationProfile }) {
  if (profile.rating == null || profile.review_count == null || profile.review_count <= 0) return null;

  const rating = profile.rating;
  const full = Math.floor(rating);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex" aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${i < full ? "fill-amber-300 text-amber-300" : "text-white/25"}`}
              />
            ))}
          </div>
          <span className="text-sm font-semibold text-white">{rating.toFixed(1)}</span>
          <span className="text-xs text-white/60">· {profile.review_count} avis publics</span>
        </div>
        <ProvenanceChip provenance="verified" source="Fiche Google publique" />
      </div>

      {profile.review_summary && (
        <p className="mt-3 text-[13.5px] leading-relaxed text-white/80">{profile.review_summary}</p>
      )}
      <p className="mt-2 text-[11px] text-white/45">
        Résumé calculé à partir de vos avis publics réels. Aucun avis n'est généré par UNPRO.
      </p>
    </section>
  );
}
