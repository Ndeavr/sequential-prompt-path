/**
 * UNPRO — ContractorEcosystemSection
 * Premium "Marques & Écosystèmes de confiance" section for contractor public profile.
 * Pulls from contractor_brand_profiles + brand_scores via useContractorBrands.
 * Renders nothing if contractor has no detected brands (graceful fallback).
 */
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Crown, Wrench } from "lucide-react";
import { useContractorBrands } from "../hooks/useContractorBrands";
import { BrandPillFromProfile } from "./BrandPill";
import BrandCloud from "./BrandCloud";

interface Props {
  contractorId: string;
}

const TIER_LABEL: Record<string, string> = {
  luxury: "Luxe",
  premium: "Premium",
  standard: "Standard",
  budget: "Économique",
  professional: "Professionnel",
  commercial: "Commercial",
};

export default function ContractorEcosystemSection({ contractorId }: Props) {
  const { brands, score, loading } = useContractorBrands(contractorId);

  if (loading) return null;
  if (!brands.length) return null;

  const primary = brands.filter((b) => b.is_primary_ecosystem);
  const secondary = brands.filter((b) => !b.is_primary_ecosystem);
  const allBrands = brands.map((b) => b.brand);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5 }}
    >
      <Card className="glass-card border-0 shadow-sm overflow-hidden">
        <CardContent className="p-5 sm:p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 text-foreground">
                <Sparkles className="w-4 h-4 text-primary" />
                <h2 className="text-base sm:text-lg font-semibold tracking-tight">
                  Marques & écosystèmes de confiance
                </h2>
              </div>
              <p className="text-xs text-foreground/60 mt-1">
                Marques et matériaux détectés dans l'écosystème de cet entrepreneur.
              </p>
            </div>

            {score && score.brand_count > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-white/[0.08] bg-white/[0.03]">
                  <Crown className="w-3 h-3 mr-1 text-amber-400" />
                  Tier {TIER_LABEL[score.budget_tier] ?? score.budget_tier}
                </Badge>
                <Badge variant="outline" className="border-white/[0.08] bg-white/[0.03]">
                  <Wrench className="w-3 h-3 mr-1 text-foreground/60" />
                  {score.brand_count} marques
                </Badge>
              </div>
            )}
          </div>

          {/* Score meter */}
          {score && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <ScoreCell label="Qualité écosystème" value={score.ecosystem_quality} />
              <ScoreCell label="Premium" value={score.premium_score} />
              <ScoreCell label="Technique" value={score.technical_score} />
              <ScoreCell label="Commercial" value={score.commercial_score} />
            </div>
          )}

          {/* Primary brands */}
          {primary.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wider text-foreground/50 font-medium">
                Écosystème principal
              </p>
              <div className="flex flex-wrap gap-2">
                {primary.map((p) => (
                  <BrandPillFromProfile key={p.id} profile={p} />
                ))}
              </div>
            </div>
          )}

          {/* Secondary brands */}
          {secondary.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wider text-foreground/50 font-medium">
                Aussi utilisé
              </p>
              <div className="flex flex-wrap gap-2">
                {secondary.map((p) => (
                  <BrandPillFromProfile key={p.id} profile={p} />
                ))}
              </div>
            </div>
          )}

          {/* Animated cloud */}
          {allBrands.length >= 6 && (
            <div className="pt-2">
              <BrandCloud brands={allBrands} speedSec={Math.max(20, allBrands.length * 4)} />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ScoreCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="text-[10px] uppercase tracking-wider text-foreground/50">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-xl font-semibold text-foreground tabular-nums">{value}</span>
        <span className="text-[10px] text-foreground/40">/100</span>
      </div>
      <div className="mt-2 h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary/60 to-primary"
          style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}
