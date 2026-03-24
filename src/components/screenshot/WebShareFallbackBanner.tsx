/**
 * UNPRO — Web Share Fallback Banner
 * Shown on high-share-potential pages on web (not mobile screenshot).
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Copy, Check, X } from "lucide-react";
import { toast } from "sonner";
import { isFeatureEnabled } from "@/lib/feature-flags";

interface WebShareFallbackBannerProps {
  url: string;
  screenName: string;
}

export default function WebShareFallbackBanner({ url, screenName }: WebShareFallbackBannerProps) {
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!isFeatureEnabled("web_share_fallback") || dismissed) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Lien copié !");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: screenName, url });
      } catch {}
    } else {
      handleCopy();
    }
  };

  return (
    <div className="relative bg-primary/5 border border-primary/15 rounded-2xl p-4 flex items-center gap-3">
      <button onClick={() => setDismissed(true)} className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted/50">
        <X className="h-3 w-3 text-muted-foreground" />
      </button>
      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Share2 className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground">Partagez cette page</p>
        <p className="text-[10px] text-muted-foreground truncate">{url}</p>
      </div>
      <div className="flex gap-1.5 shrink-0">
        <Button size="sm" variant="outline" onClick={handleCopy} className="h-8 rounded-xl text-xs gap-1">
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copié" : "Copier"}
        </Button>
        <Button size="sm" onClick={handleShare} className="h-8 rounded-xl text-xs gap-1">
          <Share2 className="h-3 w-3" /> Partager
        </Button>
      </div>
    </div>
  );
}
