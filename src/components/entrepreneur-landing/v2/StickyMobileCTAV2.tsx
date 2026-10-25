/**
 * StickyMobileCTAV2 — Single conversion CTA pinned to bottom on mobile.
 */
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { campaignLink } from "@/lib/contractorCampaignLinks";
import { useLanguage } from "@/components/ui/LanguageToggle";

interface Props {
  onTrackCta: (key: string, section: string) => void;
}

export default function StickyMobileCTAV2({ onTrackCta }: Props) {
  const navigate = useNavigate();
  const { search } = useLocation();
  const { lang } = useLanguage();
  const handleClick = () => {
    onTrackCta("sticky_book", "sticky");
    navigate(campaignLink("/entrepreneurs/audit-ia", search));
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      <div className="bg-background/85 backdrop-blur-lg border-t border-border/60 px-4 pt-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <Button
          onClick={handleClick}
          className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-[0_8px_24px_hsl(var(--primary)/0.4)] active:scale-[0.98] transition-transform"
        >
          {lang === "fr" ? "Faire mon audit IA gratuit" : "Get my free AI audit"}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
