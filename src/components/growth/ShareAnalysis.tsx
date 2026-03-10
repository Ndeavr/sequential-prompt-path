/**
 * UNPRO — Share Analysis Component
 * Allows homeowners to share quote analysis results.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Copy, Check } from "lucide-react";
import { buildShareUrl, buildQuoteShareMessage, copyToClipboard, trackConversionEvent } from "@/services/growthService";
import { toast } from "sonner";

interface ShareAnalysisProps {
  quoteId: string;
  fairnessScore: number | null;
  amount: number | null;
}

const ShareAnalysis = ({ quoteId, fairnessScore, amount }: ShareAnalysisProps) => {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = buildShareUrl(quoteId);
    const message = buildQuoteShareMessage(fairnessScore, amount);
    const fullText = `${message}${url}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "Analyse UNPRO", text: message, url });
        trackConversionEvent("referral_shared", { quoteId });
        return;
      } catch {
        // fallback to copy
      }
    }

    const ok = await copyToClipboard(fullText);
    if (ok) {
      setCopied(true);
      toast.success("Lien copié !");
      trackConversionEvent("referral_shared", { quoteId });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleShare}>
      {copied ? <Check className="h-4 w-4 mr-1" /> : <Share2 className="h-4 w-4 mr-1" />}
      {copied ? "Copié !" : "Partager l'analyse"}
    </Button>
  );
};

export default ShareAnalysis;
