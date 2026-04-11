/**
 * BadgeAlexLanguageFrenchQc — Visual indicator that Alex is in French QC mode.
 */
import { Badge } from "@/components/ui/badge";

interface Props {
  className?: string;
}

export default function BadgeAlexLanguageFrenchQc({ className }: Props) {
  return (
    <Badge
      variant="outline"
      className={`text-[10px] px-2 py-0.5 border-blue-500/30 text-blue-600 bg-blue-50 dark:bg-blue-950/30 ${className || ""}`}
    >
      🇨🇦 Français QC
    </Badge>
  );
}
