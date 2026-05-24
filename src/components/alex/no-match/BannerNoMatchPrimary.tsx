import { Sparkles } from "lucide-react";

interface Props {
  message: string;
}

export default function BannerNoMatchPrimary({ message }: Props) {
  return (
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3 shadow-[0_0_18px_hsl(var(--primary)/0.10)]">
      <div className="shrink-0 mt-0.5">
        <Sparkles className="h-5 w-5 text-primary" />
      </div>
      <p className="text-sm text-foreground leading-relaxed">{message}</p>
    </div>
  );
}
