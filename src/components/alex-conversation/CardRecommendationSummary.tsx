/**
 * CardRecommendationSummary — Recommended contractor summary card.
 */
import { motion } from "framer-motion";
import { Star, MapPin, Shield } from "lucide-react";

interface Props {
  contractorName: string;
  specialty: string;
  score: number;
  city?: string;
  avatarUrl?: string;
  delay?: number;
}

export default function CardRecommendationSummary({ contractorName, specialty, score, city, avatarUrl, delay = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay }}
      className="w-full max-w-[88%] ml-10 rounded-xl overflow-hidden"
    >
      <div
        className="p-[1px] rounded-xl"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary) / 0.35), hsl(262 80% 50% / 0.2))",
        }}
      >
        <div
          className="rounded-xl px-4 py-3.5"
          style={{
            background: "linear-gradient(135deg, hsl(var(--card) / 0.95), hsl(var(--card) / 0.85))",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center border border-primary/20 flex-shrink-0"
              style={{
                background: avatarUrl
                  ? `url(${avatarUrl}) center/cover`
                  : "linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(262 80% 50% / 0.1))",
              }}
            >
              {!avatarUrl && (
                <span className="text-base font-bold text-primary">{contractorName[0]}</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm font-semibold text-foreground truncate">{contractorName}</h4>
                <Shield className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              </div>
              <p className="text-xs text-muted-foreground">{specialty}</p>
              {city && (
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-muted-foreground/70" />
                  <span className="text-[11px] text-muted-foreground/70">{city}</span>
                </div>
              )}
            </div>

            {/* Score */}
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-0.5">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span className="text-sm font-bold text-foreground">{score}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">AIPP</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
