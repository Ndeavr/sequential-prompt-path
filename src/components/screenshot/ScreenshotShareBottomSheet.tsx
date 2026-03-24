/**
 * UNPRO — Screenshot Share Bottom Sheet
 * Premium mobile-first share prompt after screenshot detection.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Share2, Copy, X, Check, Sparkles, ExternalLink, RefreshCw } from "lucide-react";
import type { ScreenContext, ScreenshotShareVariant } from "@/types/screenshot";
import { SHARE_VARIANTS } from "@/types/screenshot";
import { useSmartShare } from "@/hooks/screenshot/useSmartShare";

interface ScreenshotShareBottomSheetProps {
  open: boolean;
  onClose: () => void;
  screenContext: ScreenContext;
  onShared?: (method: string, url: string) => void;
  onDismissed?: () => void;
}

export default function ScreenshotShareBottomSheet({
  open,
  onClose,
  screenContext,
  onShared,
  onDismissed,
}: ScreenshotShareBottomSheetProps) {
  const { shareLink, copyLink, isSharing, resolveVariant } = useSmartShare();
  const [copied, setCopied] = useState(false);

  const variant = resolveVariant(screenContext.screenKey);
  const content = SHARE_VARIANTS[variant];

  const handleShare = async () => {
    const result = await shareLink(screenContext);
    if (result) {
      onShared?.(result.method, result.url);
      setTimeout(onClose, 1200);
    }
  };

  const handleCopy = async () => {
    const result = await copyLink(screenContext);
    if (result) {
      setCopied(true);
      onShared?.(result.method, result.url);
      setTimeout(() => {
        setCopied(false);
        onClose();
      }, 1500);
    }
  };

  const handleDismiss = () => {
    onDismissed?.();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={handleDismiss}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl border-t border-border/30 shadow-2xl max-h-[85vh] overflow-hidden"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
            </div>

            <div className="px-6 pb-8 pt-2">
              {/* Close button */}
              <div className="flex justify-end mb-2">
                <button onClick={handleDismiss} className="p-1.5 rounded-full hover:bg-muted/50 transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              {/* Icon */}
              <div className="flex justify-center mb-4">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
              </div>

              {/* Content */}
              <h3 className="text-lg font-display font-bold text-center text-foreground mb-2">
                {content.title}
              </h3>
              <p className="text-sm text-muted-foreground text-center mb-5 leading-relaxed max-w-xs mx-auto">
                {content.text}
              </p>

              {/* Benefits */}
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {content.benefits.map((b) => (
                  <span
                    key={b}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/8 text-primary text-xs font-medium"
                  >
                    <Check className="h-3 w-3" />
                    {b}
                  </span>
                ))}
              </div>

              {/* Actions */}
              <div className="space-y-2.5">
                <Button
                  onClick={handleShare}
                  disabled={isSharing}
                  className="w-full h-12 rounded-2xl text-sm font-semibold gap-2"
                >
                  {isSharing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Share2 className="h-4 w-4" />
                  )}
                  {content.primaryCta}
                </Button>

                <Button
                  onClick={handleCopy}
                  variant="outline"
                  className="w-full h-11 rounded-2xl text-sm font-medium gap-2"
                >
                  {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copié !" : content.secondaryCta}
                </Button>

                <button
                  onClick={handleDismiss}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-2 transition-colors"
                >
                  Continuer
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
