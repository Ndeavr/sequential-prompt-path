/**
 * SectionProofIA — Mini counter + contextual proof text.
 */
import WidgetCounterMiniInline from "@/components/impact-counter/WidgetCounterMiniInline";
import { cn } from "@/lib/utils";

interface Props {
  contextText?: string;
  className?: string;
}

export default function SectionProofIA({ contextText, className }: Props) {
  return (
    <section className={cn("py-6 px-5", className)}>
      <div className="max-w-lg mx-auto text-center space-y-3">
        <WidgetCounterMiniInline />
        {contextText && (
          <p className="text-xs text-muted-foreground/70">{contextText}</p>
        )}
      </div>
    </section>
  );
}
