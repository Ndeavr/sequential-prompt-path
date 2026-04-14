/**
 * UNPRO — Alex Referral Confirmation Panel
 * Shown in Alex conversation when an affiliate is detected.
 */
import { useState } from "react";
import { Check, X, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  affiliateName: string;
  confidenceScore?: number;
  onConfirm: () => void;
  onReject: () => void;
}

const PanelAlexReferralConfirmation = ({ affiliateName, confidenceScore, onConfirm, onReject }: Props) => {
  const [responded, setResponded] = useState<"confirmed" | "rejected" | null>(null);

  if (responded === "confirmed") {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20">
        <UserCheck className="h-4 w-4 text-primary shrink-0" />
        <p className="text-sm text-foreground">
          Référé par <span className="font-semibold">{affiliateName}</span> ✓
        </p>
      </div>
    );
  }

  if (responded === "rejected") {
    return null;
  }

  return (
    <div className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
      <p className="text-sm text-foreground">
        👋 Vous avez été référé par <span className="font-semibold text-primary">{affiliateName}</span>. C'est bien ça ?
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => { setResponded("confirmed"); onConfirm(); }}
          className="flex-1 gap-1.5"
        >
          <Check className="h-3.5 w-3.5" /> Oui
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => { setResponded("rejected"); onReject(); }}
          className="flex-1 gap-1.5"
        >
          <X className="h-3.5 w-3.5" /> Non
        </Button>
      </div>
    </div>
  );
};

export default PanelAlexReferralConfirmation;
