/**
 * LikeShareButtons — Reusable like + share overlay for images, projects, profiles
 * Premium animated interactions with glass morphism
 */
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Share2, Link2, Copy, Check, MessageCircle } from "lucide-react";
import { useLikes, useShareTracking, type LikeEntityType } from "@/hooks/useLikes";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Props {
  entityType: LikeEntityType;
  entityId: string;
  /** "overlay" for on-image, "inline" for beside text */
  variant?: "overlay" | "inline";
  /** Show count number */
  showCount?: boolean;
  /** Size */
  size?: "sm" | "md" | "lg";
  /** Custom class */
  className?: string;
  /** Share URL override */
  shareUrl?: string;
  /** Share title for native share */
  shareTitle?: string;
}

export default function LikeShareButtons({
  entityType,
  entityId,
  variant = "overlay",
  showCount = true,
  size = "md",
  className = "",
  shareUrl,
  shareTitle,
}: Props) {
  const { user } = useAuth();
  const { count, liked, toggle } = useLikes(entityType, entityId);
  const { trackShare } = useShareTracking();
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const iconSize = size === "sm" ? 14 : size === "lg" ? 22 : 18;
  const btnSize = size === "sm" ? "w-7 h-7" : size === "lg" ? "w-11 h-11" : "w-9 h-9";

  const url = shareUrl || window.location.href;

  const handleLike = useCallback(() => {
    if (!user) {
      toast.info("Créez un compte gratuit pour sauvegarder vos favoris");
      return;
    }
    toggle();
  }, [user, toggle]);

  const handleCopyLink = useCallback(async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    trackShare(entityType, entityId, "copy_link");
    toast.success("Lien copié !");
    setTimeout(() => setCopied(false), 2000);
    setShareMenuOpen(false);
  }, [url, entityType, entityId, trackShare]);

  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle || "UNPRO",
          url,
        });
        trackShare(entityType, entityId, "native");
      } catch {
        // User cancelled
      }
    } else {
      handleCopyLink();
    }
    setShareMenuOpen(false);
  }, [url, shareTitle, entityType, entityId, trackShare, handleCopyLink]);

  const handleSMS = useCallback(() => {
    const smsUrl = `sms:?body=${encodeURIComponent(`${shareTitle || "Regarde ça sur UNPRO"} ${url}`)}`;
    window.open(smsUrl);
    trackShare(entityType, entityId, "sms");
    setShareMenuOpen(false);
  }, [url, shareTitle, entityType, entityId, trackShare]);

  if (variant === "overlay") {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        {/* Like button */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={handleLike}
          className={`${btnSize} rounded-full bg-background/70 backdrop-blur-md flex items-center justify-center shadow-lg border border-border/50 hover:bg-background/90 transition-colors group relative`}
        >
          <AnimatePresence mode="wait">
            {liked ? (
              <motion.div
                key="liked"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 15 }}
              >
                <Heart className="text-red-500 fill-red-500" size={iconSize} />
              </motion.div>
            ) : (
              <motion.div key="not-liked" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
                <Heart className="text-foreground group-hover:text-red-400 transition-colors" size={iconSize} />
              </motion.div>
            )}
          </AnimatePresence>
          {showCount && count > 0 && (
            <span className="absolute -bottom-1 -right-1 min-w-[16px] h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
              {count}
            </span>
          )}
        </motion.button>

        {/* Share button */}
        <div className="relative">
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => setShareMenuOpen(!shareMenuOpen)}
            className={`${btnSize} rounded-full bg-background/70 backdrop-blur-md flex items-center justify-center shadow-lg border border-border/50 hover:bg-background/90 transition-colors`}
          >
            <Share2 className="text-foreground" size={iconSize} />
          </motion.button>

          {/* Share menu */}
          <AnimatePresence>
            {shareMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute right-0 top-full mt-2 z-50 w-44 rounded-xl bg-card border border-border shadow-xl overflow-hidden"
              >
                <button
                  onClick={handleNativeShare}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                >
                  <Share2 size={14} className="text-muted-foreground" />
                  Partager
                </button>
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                >
                  {copied ? <Check size={14} className="text-green-500" /> : <Link2 size={14} className="text-muted-foreground" />}
                  {copied ? "Copié !" : "Copier le lien"}
                </button>
                <button
                  onClick={handleSMS}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                >
                  <MessageCircle size={14} className="text-muted-foreground" />
                  Envoyer par SMS
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // Inline variant
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <button
        onClick={handleLike}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
      >
        <motion.div whileTap={{ scale: 0.8 }}>
          {liked ? (
            <Heart className="text-red-500 fill-red-500" size={iconSize} />
          ) : (
            <Heart className="group-hover:text-red-400 transition-colors" size={iconSize} />
          )}
        </motion.div>
        {showCount && <span className="font-medium">{count > 0 ? count : ""}</span>}
      </button>

      <button
        onClick={handleNativeShare}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Share2 size={iconSize} />
      </button>
    </div>
  );
}
