/**
 * UNPRO — Alex AI Concierge Overlay
 * Contextual message overlay with 2 action buttons max.
 */
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface AlexAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "outline" | "ghost";
}

interface AlexOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  subMessage?: string;
  actions?: AlexAction[];
}

export default function AlexOverlay({ isOpen, onClose, message, subMessage, actions = [] }: AlexOverlayProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed bottom-24 right-6 z-50 w-[320px] max-w-[calc(100vw-3rem)]"
        >
          <div className="relative bg-card/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-[var(--shadow-2xl)] overflow-hidden">
            {/* Glass highlight */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 h-6 w-6 rounded-full bg-muted/80 flex items-center justify-center hover:bg-muted transition-colors"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>

            <div className="p-4 space-y-3">
              {/* Avatar + message */}
              <div className="flex gap-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center shrink-0">
                  <Bot className="h-4.5 w-4.5 text-primary" />
                </div>
                <div className="space-y-1 min-w-0">
                  <p className="text-[11px] font-semibold text-primary">Alex</p>
                  <p className="text-sm text-foreground leading-relaxed">{message}</p>
                  {subMessage && (
                    <p className="text-xs text-muted-foreground">{subMessage}</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              {actions.length > 0 && (
                <div className="flex gap-2 pl-12">
                  {actions.slice(0, 2).map((action, i) => (
                    <Button
                      key={i}
                      size="sm"
                      variant={action.variant || (i === 0 ? "default" : "outline")}
                      className="rounded-xl text-xs flex-1"
                      onClick={action.onClick}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
