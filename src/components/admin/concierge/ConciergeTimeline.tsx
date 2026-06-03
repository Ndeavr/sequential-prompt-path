/**
 * UNPRO — Concierge touch timeline.
 */
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Mail, MessageSquare, Phone, Voicemail, User, FileText, Sparkles } from "lucide-react";
import type { ConciergeTouch } from "@/hooks/useConcierge";

const ICON = {
  sms: MessageSquare,
  email: Mail,
  call: Phone,
  voicemail: Voicemail,
  inperson: User,
  note: FileText,
  system: Sparkles,
} as const;

export default function ConciergeTimeline({ touches }: { touches: ConciergeTouch[] }) {
  if (!touches.length) {
    return (
      <div className="text-sm text-muted-foreground italic px-2 py-6 text-center">
        Aucune touche journalisée. Envoyez un premier message.
      </div>
    );
  }
  return (
    <ol className="space-y-3">
      {touches.map((t) => {
        const Icon = ICON[t.channel] || FileText;
        const isIn = t.direction === "in";
        return (
          <li key={t.id} className="flex gap-3">
            <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 border ${isIn ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-primary/10 border-primary/30 text-primary"}`}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="uppercase tracking-wider">{t.channel}</span>
                <span>·</span>
                <span>{isIn ? "Reçu" : t.direction === "out" ? "Envoyé" : "Interne"}</span>
                <span>·</span>
                <span>{formatDistanceToNow(new Date(t.occurred_at), { addSuffix: true, locale: fr })}</span>
              </div>
              {t.body && (
                <div className="mt-1 text-sm text-foreground/85 whitespace-pre-wrap leading-snug">
                  {t.body.length > 220 ? `${t.body.slice(0, 220)}…` : t.body}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
