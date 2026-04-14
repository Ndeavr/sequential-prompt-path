import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, GitMerge, Loader2 } from "lucide-react";
import { useState } from "react";
import BadgeApprovalState from "./BadgeApprovalState";
import PanelSourceConfidence from "./PanelSourceConfidence";

interface Company {
  id: string;
  legal_name: string | null;
  display_name: string | null;
  neq_number: string | null;
  rbq_number: string | null;
  website: string | null;
  primary_email: string | null;
  primary_phone: string | null;
  status: string;
  city_name?: string;
  domain_name?: string;
}

interface SourceField {
  id: string;
  field_name: string;
  field_value_text: string | null;
  source_name: string;
  confidence_score: number;
  is_selected: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company | null;
  sourceFields: SourceField[];
  onApprove: (companyId: string) => Promise<void>;
  onReject: (companyId: string, notes: string) => Promise<void>;
  onMerge?: (companyId: string) => void;
  loading?: boolean;
}

export default function DrawerCompanyMergeReview({
  open, onOpenChange, company, sourceFields,
  onApprove, onReject, onMerge, loading,
}: Props) {
  const [notes, setNotes] = useState("");

  if (!company) return null;

  const name = company.legal_name || company.display_name || "Sans nom";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {name}
            <BadgeApprovalState status={company.status} />
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Identity summary */}
          <div className="space-y-2 text-sm">
            {company.neq_number && <p><span className="text-muted-foreground">NEQ:</span> {company.neq_number}</p>}
            {company.rbq_number && <p><span className="text-muted-foreground">RBQ:</span> {company.rbq_number}</p>}
            {company.website && <p><span className="text-muted-foreground">Web:</span> {company.website}</p>}
            {company.primary_email && <p><span className="text-muted-foreground">Email:</span> {company.primary_email}</p>}
            {company.primary_phone && <p><span className="text-muted-foreground">Tél:</span> {company.primary_phone}</p>}
            {company.city_name && <p><span className="text-muted-foreground">Ville:</span> {company.city_name}</p>}
            {company.domain_name && <p><span className="text-muted-foreground">Domaine:</span> {company.domain_name}</p>}
          </div>

          {/* Source fields */}
          <PanelSourceConfidence fields={sourceFields} />

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes de revue</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes optionnelles..."
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => onApprove(company.id)}
              disabled={loading}
              className="w-full"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              Approuver
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onMerge?.(company.id)}
                disabled={loading}
                className="flex-1"
              >
                <GitMerge className="w-4 h-4 mr-2" />
                Fusionner
              </Button>
              <Button
                variant="destructive"
                onClick={() => onReject(company.id, notes)}
                disabled={loading}
                className="flex-1"
              >
                <X className="w-4 h-4 mr-2" />
                Rejeter
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
