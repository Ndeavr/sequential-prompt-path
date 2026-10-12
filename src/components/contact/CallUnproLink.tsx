import { Phone } from "lucide-react";
import { PUBLIC_PHONE } from "@/config/publicContact";
import { logFunnelEvent } from "@/lib/analytics/logFunnelEvent";
import { cn } from "@/lib/utils";

interface Props {
  context: string;
  label?: string;
  compact?: boolean;
  className?: string;
}

/** Lien d'appel natif secondaire. Le clic n'implique jamais qu'un appel a abouti. */
export function CallUnproLink({ context, label, compact, className }: Props) {
  const text = label ?? (compact ? "Appeler UNPRO" : `Appeler UNPRO — ${PUBLIC_PHONE.display}`);
  return (
    <a
      href={PUBLIC_PHONE.tel}
      data-testid="call-unpro-link"
      aria-label={`Appeler UNPRO au ${PUBLIC_PHONE.display}`}
      onClick={() => {
        void logFunnelEvent({
          event_type: "call_cta_clicked",
          metadata: { context, route: typeof window !== "undefined" ? window.location.pathname : null },
        });
      }}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-[18px] px-4 py-2 text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{text}</span>
      {compact && <span className="opacity-80">{PUBLIC_PHONE.display}</span>}
    </a>
  );
}
