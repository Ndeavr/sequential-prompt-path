import { CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  isComplete: boolean;
  score: number;
}

export default function BadgeProfileCompleteState({ isComplete, score }: Props) {
  if (isComplete) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">
        <CheckCircle2 className="h-3 w-3" />
        Complet
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600">
      <AlertCircle className="h-3 w-3" />
      {score}%
    </span>
  );
}
