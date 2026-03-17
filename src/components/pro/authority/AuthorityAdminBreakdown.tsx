/**
 * Authority Score V2 — Admin Breakdown Panel
 * Shows all 8 dimensions with weights and raw metrics.
 */
import { motion } from "framer-motion";
import type { AuthorityResult } from "@/services/authorityScoreV2";
import { DIMENSION_META, TIER_META } from "@/services/authorityScoreV2";
import type { AuthorityDimensions } from "@/services/authorityScoreV2";
import type { AuthorityEventRow } from "@/hooks/useAuthorityScoreV2";
import { Shield, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  score: AuthorityResult;
  events: AuthorityEventRow[];
}

function DimensionRow({ dimKey, value, index }: { dimKey: keyof AuthorityDimensions; value: number; index: number }) {
  const meta = DIMENSION_META[dimKey];
  const pct = value;
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 + index * 0.05 }}
      className="space-y-1.5"
    >
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{meta.label}</span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground/60 text-[10px]">{meta.weight}%</span>
          <span className="text-foreground tabular-nums font-semibold">{value}</span>
        </div>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted/30 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: meta.color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 + index * 0.06 }}
        />
      </div>
    </motion.div>
  );
}

export default function AuthorityAdminBreakdown({ score, events }: Props) {
  const dims = Object.keys(DIMENSION_META) as (keyof AuthorityDimensions)[];
  const tierMeta = TIER_META[score.tier] ?? TIER_META.bronze;

  return (
    <div className="space-y-5">
      {/* Summary header */}
      <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="font-display text-sm font-semibold text-foreground">Détail Authority Score V2</h3>
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ background: `${tierMeta.color}20`, color: tierMeta.color }}
          >
            {tierMeta.labelFr}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="rounded-xl bg-muted/15 border border-border/30 p-3 text-center">
            <p className="text-[10px] text-muted-foreground/70 mb-0.5">Score global</p>
            <p className="text-2xl font-bold font-display text-foreground">{score.overall}</p>
          </div>
          <div className="rounded-xl bg-muted/15 border border-border/30 p-3 text-center">
            <p className="text-[10px] text-muted-foreground/70 mb-0.5">Confiance</p>
            <p className="text-2xl font-bold font-display text-foreground">{Math.round(score.confidence * 100)}%</p>
          </div>
          <div className="rounded-xl bg-muted/15 border border-border/30 p-3 text-center">
            <p className="text-[10px] text-muted-foreground/70 mb-0.5">Tags</p>
            <p className="text-lg font-bold font-display text-foreground">{score.tags.length}</p>
          </div>
        </div>

        {/* All dimensions */}
        <div className="space-y-3">
          {dims.map((key, i) => (
            <DimensionRow key={key} dimKey={key} value={score.dimensions[key]} index={i} />
          ))}
        </div>
      </div>

      {/* Tags */}
      {score.tags.length > 0 && (
        <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5">
          <h3 className="font-display text-sm font-semibold text-foreground mb-3">Tags attribués</h3>
          <div className="flex flex-wrap gap-2">
            {score.tags.map((tag) => (
              <span key={tag} className="px-3 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary border border-primary/20">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent events */}
      <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5">
        <h3 className="font-display text-sm font-semibold text-foreground mb-3">Événements récents</h3>
        {events.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucun événement enregistré.</p>
        ) : (
          <div className="space-y-2">
            {events.slice(0, 10).map((evt) => (
              <div key={evt.id} className="flex items-center gap-3 text-xs p-2 rounded-lg bg-muted/10">
                {evt.delta_score > 0 ? (
                  <TrendingUp className="w-3.5 h-3.5 text-success flex-shrink-0" />
                ) : evt.delta_score < 0 ? (
                  <TrendingDown className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                ) : (
                  <Minus className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                )}
                <span className="text-foreground font-medium flex-1 truncate">{evt.event_type}</span>
                <span className="text-muted-foreground/60 tabular-nums">{evt.delta_score > 0 ? "+" : ""}{evt.delta_score}</span>
                <span className="text-muted-foreground/50 text-[10px]">
                  {new Date(evt.created_at).toLocaleDateString("fr-CA")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
