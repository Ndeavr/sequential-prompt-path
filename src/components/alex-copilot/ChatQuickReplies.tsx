/**
 * ChatQuickReplies — 2–4 contextual chips under an Alex bubble.
 */
import type { QuickReply } from "@/services/alexCopilotEngine";

interface Props {
  replies: QuickReply[];
  onSelect: (reply: QuickReply) => void;
  disabled?: boolean;
}

export default function ChatQuickReplies({ replies, onSelect, disabled }: Props) {
  if (!replies || replies.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {replies.slice(0, 4).map((r) => (
        <button
          key={r.id}
          disabled={disabled}
          onClick={() => onSelect(r)}
          className="px-3.5 py-2 rounded-full text-[13px] font-medium bg-white/8 border border-white/15 text-white/90 hover:bg-sky-400/15 hover:border-sky-400/40 hover:text-white active:scale-95 transition-all disabled:opacity-50"
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
