/**
 * QuoteUploadInviteCard — Inline chat card inviting the homeowner to upload quotes for AI comparison.
 */
import { Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onUpload?: () => void;
  onSkip?: () => void;
}

export default function QuoteUploadInviteCard({ onUpload, onSkip }: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/15 p-2.5">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-readable">Analyse de vos soumissions</h3>
          <p className="text-sm text-readable-secondary mt-1">
            Téléversez vos soumissions (PDF, photo, capture d'écran). Je les compare et identifie les bons points,
            les écarts et les drapeaux rouges.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={onUpload} size="sm" className="gap-2">
          <Upload className="w-4 h-4" />
          Téléverser
        </Button>
        <Button onClick={onSkip} size="sm" variant="ghost">
          Plus tard
        </Button>
      </div>
    </div>
  );
}
