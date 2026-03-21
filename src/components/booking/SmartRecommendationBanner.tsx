import { Sparkles } from "lucide-react";

interface SmartRecommendationBannerProps {
  message: string;
  subMessage?: string;
}

export function SmartRecommendationBanner({ message, subMessage }: SmartRecommendationBannerProps) {
  return (
    <div className="rounded-xl bg-gradient-to-r from-primary/8 via-secondary/6 to-accent/6 border border-primary/15 p-4 flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-4 h-4 text-primary" />
      </div>
      <div>
        <p className="text-meta font-medium text-foreground">{message}</p>
        {subMessage && (
          <p className="text-caption text-muted-foreground mt-0.5">{subMessage}</p>
        )}
      </div>
    </div>
  );
}
