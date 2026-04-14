import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Loader2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import PanelVisibilityScorePreview from "./PanelVisibilityScorePreview";
import { useVisibilityScore } from "@/hooks/useOutboundProspects";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prospect: any | null;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, notes: string) => Promise<void>;
  loading?: boolean;
}

export default function DrawerProspectReview({
  open, onOpenChange, prospect, onApprove, onReject, loading,
}: Props) {
  const [notes, setNotes] = useState("");
  const { data: visScore } = useVisibilityScore(prospect?.id ?? null);

  if (!prospect) return null;

  const name = prospect.legal_name || prospect.business_name || "Sans nom";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {name}
            <Badge variant="outline" className="text-xs">{prospect.status}</Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="space-y-2 text-sm">
            {prospect.city && <p><span className="text-muted-foreground">Ville:</span> {prospect.city}</p>}
            {prospect.category && <p><span className="text-muted-foreground">Catégorie:</span> {prospect.category}</p>}
            {prospect.email && <p><span className="text-muted-foreground">Email:</span> {prospect.email}</p>}
            {prospect.phone && <p><span className="text-muted-foreground">Tél:</span> {prospect.phone}</p>}
            {prospect.website && <p><span className="text-muted-foreground">Web:</span> {prospect.website}</p>}
            {prospect.source && <p><span className="text-muted-foreground">Source:</span> {prospect.source}</p>}
          </div>

          {/* Inline scores from prospect */}
          {prospect.aipp_score != null && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded bg-muted/50"><span className="text-muted-foreground">AIPP:</span> {Math.round(prospect.aipp_score)}</div>
              {prospect.seo_score != null && <div className="p-2 rounded bg-muted/50"><span className="text-muted-foreground">SEO:</span> {Math.round(prospect.seo_score)}</div>}
              {prospect.local_score != null && <div className="p-2 rounded bg-muted/50"><span className="text-muted-foreground">Local:</span> {Math.round(prospect.local_score)}</div>}
              {prospect.trust_score != null && <div className="p-2 rounded bg-muted/50"><span className="text-muted-foreground">Trust:</span> {Math.round(prospect.trust_score)}</div>}
            </div>
          )}

          <PanelVisibilityScorePreview score={visScore} prospectName={name} />

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes optionnelles…" rows={2} />
          </div>

          <div className="flex flex-col gap-2">
            <Button onClick={() => onApprove(prospect.id)} disabled={loading} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              Approuver pour campagne
            </Button>
            <Button variant="destructive" onClick={() => onReject(prospect.id, notes)} disabled={loading} className="w-full">
              <X className="w-4 h-4 mr-2" /> Rejeter
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
