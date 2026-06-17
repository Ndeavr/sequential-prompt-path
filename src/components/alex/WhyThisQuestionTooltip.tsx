/**
 * WhyThisQuestionTooltip — Small "?" badge that explains why Alex is asking a given question.
 */
import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  reason: string;
}

export default function WhyThisQuestionTooltip({ reason }: Props) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Pourquoi cette question ?"
            className="inline-flex items-center justify-center rounded-full p-1 text-readable-muted hover:text-readable transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          {reason}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
