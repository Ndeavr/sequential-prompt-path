/**
 * UNPRO — Share Actions Row
 * Copy link, native share, download QR actions.
 * Bilingual FR/EN support.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Share2, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { trackReferralEvent } from "@/hooks/useReferralAttribution";
import { useLanguage } from "@/components/ui/LanguageToggle";

const t = {
  copied: { fr: "Lien copié !", en: "Link copied!" },
  copyFail: { fr: "Impossible de copier", en: "Unable to copy" },
  copyBtn: { fr: "Copier le lien", en: "Copy link" },
  copiedBtn: { fr: "Copié !", en: "Copied!" },
  share: { fr: "Partager", en: "Share" },
  defaultShareText: { fr: "Découvrez UNPRO", en: "Discover UNPRO" },
};

interface ShareActionsRowProps {
  url: string;
  referralCode: string;
  shareTitle?: string;
  shareText?: string;
}

const ShareActionsRow = ({ url, referralCode, shareTitle, shareText }: ShareActionsRowProps) => {
  const { lang } = useLanguage();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: t.copied[lang] });
      trackReferralEvent("link_copy", referralCode);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: t.copyFail[lang], variant: "destructive" });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle || "UNPRO",
          text: shareText || t.defaultShareText[lang],
          url,
        });
        trackReferralEvent("native_share", referralCode);
      } catch {}
    } else {
      handleCopy();
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center gap-2 p-2.5 bg-muted/40 rounded-xl border border-border/20 min-w-0">
        <span className="text-xs sm:text-sm text-muted-foreground truncate flex-1 font-mono min-w-0">{url}</span>
        <Button variant="ghost" size="icon" onClick={handleCopy} className="h-8 w-8 shrink-0">
          {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <div className="flex gap-2">
        <Button onClick={handleCopy} variant="outline" className="flex-1 rounded-full gap-2">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? t.copiedBtn[lang] : t.copyBtn[lang]}
        </Button>
        <Button onClick={handleShare} className="flex-1 rounded-full gap-2">
          <Share2 className="h-4 w-4" />
          {t.share[lang]}
        </Button>
      </div>
    </div>
  );
};

export default ShareActionsRow;
