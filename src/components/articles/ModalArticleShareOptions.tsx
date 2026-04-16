/**
 * UNPRO — Share modal with channel options.
 */
import { Copy, Mail, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onClose: () => void;
  url: string;
  title: string;
  onShare: (channel: string) => void;
}

const CHANNELS = [
  { key: "facebook", label: "Facebook", icon: "f", href: (u: string, t: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}` },
  { key: "x", label: "X", icon: "𝕏", href: (u: string, t: string) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}` },
  { key: "linkedin", label: "LinkedIn", icon: "in", href: (u: string, t: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}` },
];

export default function ModalArticleShareOptions({ open, onClose, url, title, onShare }: Props) {
  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    onShare("copy_link");
    toast.success("Lien copié!");
    onClose();
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        onShare("native");
        onClose();
      } catch { /* cancelled */ }
    }
  };

  const openChannel = (key: string, href: string) => {
    window.open(href, "_blank", "width=600,height=400");
    onShare(key);
    onClose();
  };

  const emailShare = () => {
    window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`);
    onShare("email");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-base">Partager l'article</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 pt-2">
          {/* Copy */}
          <button onClick={copyLink} className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border/50 hover:bg-muted/30 transition text-sm">
            <Copy className="h-4 w-4 text-primary" /> Copier le lien
          </button>

          {/* Native */}
          {typeof navigator !== "undefined" && navigator.share && (
            <button onClick={nativeShare} className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border/50 hover:bg-muted/30 transition text-sm">
              <Share2Icon /> Partager
            </button>
          )}

          {/* Social */}
          {CHANNELS.map((ch) => (
            <button
              key={ch.key}
              onClick={() => openChannel(ch.key, ch.href(url, title))}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border/50 hover:bg-muted/30 transition text-sm"
            >
              <span className="w-4 text-center font-bold text-primary text-xs">{ch.icon}</span>
              {ch.label}
            </button>
          ))}

          {/* Email */}
          <button onClick={emailShare} className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border/50 hover:bg-muted/30 transition text-sm">
            <Mail className="h-4 w-4 text-primary" /> Email
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Share2Icon() {
  return (
    <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}
