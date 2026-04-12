/**
 * UNPRO — Alex Profile Completion Card
 * Shows profile completion progress + next action suggestion.
 */
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle } from "lucide-react";
import UnproIcon from "@/components/brand/UnproIcon";

interface AlexProfileCompletionCardProps {
  completionPercent: number;
  missingItems: string[];
  onAction?: () => void;
  role?: string | null;
}

export default function AlexProfileCompletionCard({
  completionPercent,
  missingItems,
  onAction,
  role,
}: AlexProfileCompletionCardProps) {
  const isComplete = completionPercent >= 100;

  const alexMessage = isComplete
    ? "Votre profil est complet ! Vous êtes prêt."
    : `Pour mieux vous aider, complétez votre profil (${completionPercent}%).`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-2xl bg-card border border-border shadow-[var(--shadow-sm)]"
    >
      <div className="flex items-start gap-3">
        <img src={logo} alt="Alex" className="h-8 w-8 object-contain shrink-0 mt-0.5" />
        <div className="flex-1 space-y-3">
          <p className="text-sm text-foreground">{alexMessage}</p>

          {/* Progress bar */}
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${completionPercent}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>

          {/* Missing items */}
          {!isComplete && missingItems.length > 0 && (
            <div className="space-y-1">
              {missingItems.slice(0, 3).map((item) => (
                <div key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <AlertCircle className="h-3 w-3 text-warning" />
                  {item}
                </div>
              ))}
            </div>
          )}

          {isComplete && (
            <div className="flex items-center gap-2 text-xs text-success">
              <CheckCircle className="h-3 w-3" />
              Profil complet
            </div>
          )}

          {!isComplete && onAction && (
            <Button size="sm" onClick={onAction} className="rounded-xl text-xs h-8">
              Compléter mon profil
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
