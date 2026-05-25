/**
 * <SmartFieldShell> — wraps any form field with:
 *  - label
 *  - smart bubble trigger
 *  - inline AI recommendation chip ("UNPRO recommande 25 km")
 *  - accept-suggestion shortcut
 */
import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { Label } from "@/components/ui/label";
import { SmartBubble } from "./SmartBubble";
import { useSmartContext } from "@/features/smartContext/useSmartContext";
import type { SmartContextRuntime } from "@/features/smartContext/types";

interface SmartFieldShellProps {
  id: string;
  runtime?: SmartContextRuntime;
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
  onAskAlex?: (entryId: string) => void;
  onAcceptRecommendation?: (value: string | number | undefined) => void;
  hideRecommendationChip?: boolean;
}

export function SmartFieldShell({
  id,
  runtime,
  htmlFor,
  required,
  children,
  onAskAlex,
  onAcceptRecommendation,
  hideRecommendationChip,
}: SmartFieldShellProps) {
  const entry = useSmartContext(id, runtime ?? {});

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {entry?.label && (
          <Label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-wider text-foreground/85">
            {entry.label}
            {required && <span className="text-destructive ml-0.5">*</span>}
          </Label>
        )}
        <SmartBubble
          id={id}
          runtime={runtime}
          onAskAlex={onAskAlex}
          onAcceptRecommendation={onAcceptRecommendation}
        />
      </div>

      {children}

      {!hideRecommendationChip && entry?.recommendation && (
        <button
          type="button"
          onClick={() => onAcceptRecommendation?.(entry.recommendation?.value)}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors"
        >
          <Sparkles className="h-3 w-3" />
          <span>
            UNPRO recommande{entry.recommendation.value !== undefined ? ` ${entry.recommendation.value}` : ""}
          </span>
        </button>
      )}
    </div>
  );
}

export default SmartFieldShell;
