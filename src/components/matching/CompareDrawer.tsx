/**
 * UNPRO — Compare Contractors Drawer
 * Uses the comparison engine for structured, neutral comparison.
 */

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Scale } from "lucide-react";
import ContractorComparisonView from "@/components/matching/ContractorComparisonView";
import type { ComparisonContractor } from "@/services/contractor/comparisonEngine";
import type { MatchEvaluation } from "@/types/matching";

interface CompareDrawerProps {
  matches: MatchEvaluation[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemove: (id: string) => void;
}

/** Convert MatchEvaluation to ComparisonContractor */
function toComparisonContractor(m: MatchEvaluation): ComparisonContractor {
  return {
    id: m.contractor_id,
    business_name: m.business_name ?? "Inconnu",
    city: m.city,
    province: m.province,
    logo_url: m.logo_url,
    rating: m.rating,
    review_count: m.review_count,
    verification_status: m.verification_status,
    admin_verified: (m as any).admin_verified,
    years_experience: m.years_experience,
    specialty: m.specialty,
    unpro_score: m.unpro_score_snapshot,
    aipp_score: m.aipp_score_snapshot,
    service_match: m.project_fit_score >= 80 ? "exact" : m.project_fit_score >= 50 ? "partial" : "unknown",
  };
}

const CompareDrawer = ({ matches, open, onOpenChange, onRemove }: CompareDrawerProps) => {
  if (matches.length < 2) return null;

  const contractors = matches.map(toComparisonContractor);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" />
            Comparer les entrepreneurs
          </SheetTitle>
        </SheetHeader>

        <ContractorComparisonView
          contractors={contractors}
          onRemove={onRemove}
        />
      </SheetContent>
    </Sheet>
  );
};

export default CompareDrawer;
