/**
 * HelpPopup — Appears after 10 seconds on first visit.
 * Asks: "Comment pouvons-nous vous aider?"
 * Options: Propriétaire, Entrepreneur, or free-text comment sent to dde@unpro.ca
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Home, Briefcase, Send, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "unpro_help_popup_shown";
const DELAY_MS = 10_000;

export default function HelpPopup() {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<"choices" | "comment" | "sent">("choices");
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();
  const { openAlex } = useAlexVoice();
  const isCheckout = window.location.pathname.startsWith("/checkout");

  useEffect(() => {
    if (isCheckout) return;
    const already = sessionStorage.getItem(STORAGE_KEY);
    if (already) return;
    const timer = setTimeout(() => {
      setVisible(true);
      sessionStorage.setItem(STORAGE_KEY, "1");
    }, DELAY_MS);
    return () => clearTimeout(timer);
  }, [isCheckout]);

  const close = useCallback(() => setVisible(false), []);

  const handleOwner = () => {
    close();
    openAlex("homeowner");
  };

  const handlePro = () => {
    close();
    navigate("/entrepreneurs");
  };

  const handleSendComment = async () => {
    if (!comment.trim()) return;
    setSending(true);
    try {
      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "contact-comment",
          recipientEmail: "dde@unpro.ca",
          idempotencyKey: `contact-popup-${Date.now()}`,
          templateData: {
            message: comment.trim(),
            page: window.location.pathname,
          },
        },
      });
      setMode("sent");
    } catch {
      setMode("sent");
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-20 right-4 z-50 w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-border/60 bg-background/95 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.15)] backdrop-blur-xl lg:bottom-6 lg:right-6"
        >
          {/* Close */}
          <button
            onClick={close}
            className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>

          {mode === "choices" && (
            <div className="space-y-4">
              <div>
                <p className="text-lg font-semibold text-foreground">
                  Comment on peut vous aider?
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choisissez votre profil ou laissez-nous un message.
                </p>
              </div>

              <div className="grid gap-2">
                <button
                  onClick={handleOwner}
                  className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-left text-sm font-medium text-foreground transition hover:border-primary/40 hover:bg-primary/5"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Home className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold">Je suis propriétaire</p>
                    <p className="text-xs text-muted-foreground">Parler avec Alex</p>
                  </div>
                </button>

                <button
                  onClick={handlePro}
                  className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-left text-sm font-medium text-foreground transition hover:border-primary/40 hover:bg-primary/5"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold">Je suis entrepreneur</p>
                    <p className="text-xs text-muted-foreground">Voir les options pro</p>
                  </div>
                </button>

                <button
                  onClick={() => setMode("comment")}
                  className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-left text-sm font-medium text-foreground transition hover:border-primary/40 hover:bg-primary/5"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold">Laisser un commentaire</p>
                    <p className="text-xs text-muted-foreground">Envoyer à dde@unpro.ca</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {mode === "comment" && (
            <div className="space-y-3">
              <p className="text-base font-semibold text-foreground">Votre message</p>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Écrivez votre commentaire ici..."
                className="w-full rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/20"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setMode("choices")}
                  className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted"
                >
                  Retour
                </button>
                <button
                  onClick={handleSendComment}
                  disabled={!comment.trim() || sending}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  Envoyer
                </button>
              </div>
            </div>
          )}

          {mode === "sent" && (
            <div className="space-y-3 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Send className="h-5 w-5" />
              </div>
              <p className="text-base font-semibold text-foreground">Merci!</p>
              <p className="text-sm text-muted-foreground">
                Votre message a été envoyé à notre équipe.
              </p>
              <button
                onClick={close}
                className="rounded-xl bg-muted px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted/80"
              >
                Fermer
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
