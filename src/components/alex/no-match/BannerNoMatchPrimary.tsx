import { AlertTriangle } from "lucide-react";

interface Props {
  message: string;
}

export default function BannerNoMatchPrimary({ message }: Props) {
  return (
    <div className="bg-muted/60 border border-border rounded-xl p-4 flex items-start gap-3">
      <div className="shrink-0 mt-0.5">
        <AlertTriangle className="h-5 w-5 text-warning" />
      </div>
      <p className="text-sm text-foreground leading-relaxed">{message}</p>
    </div>
  );
}
