/**
 * UNPRO — Lead Decision Card
 * Accept / Decline a matched lead with optional decline reason.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, X, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

const DECLINE_CODES = [
  { code: "out_of_scope", label: "Hors de mon champ d'expertise" },
  { code: "too_far", label: "Trop éloigné de ma zone" },
  { code: "no_capacity", label: "Pas de disponibilité" },
  { code: "budget_too_low", label: "Budget insuffisant" },
  { code: "project_unclear", label: "Projet mal défini" },
  { code: "other", label: "Autre raison" },
];

interface Props {
  matchId: string;
  responseStatus?: string | null;
  onDecision?: () => void;
}

export default function LeadDecisionCard({ matchId, responseStatus, onDecision }: Props) {
  const [loading, setLoading] = useState<"accepted" | "declined" | null>(null);
  const [showDecline, setShowDecline] = useState(false);
  const [declineCode, setDeclineCode] = useState("");
  const [declineReason, setDeclineReason] = useState("");

  if (responseStatus === "accepted") {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-center gap-2">
        <Check className="h-4 w-4 text-emerald-500" />
        <span className="text-xs font-medium text-emerald-400">Lead accepté</span>
      </div>
    );
  }

  if (responseStatus === "declined") {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 flex items-center gap-2">
        <X className="h-4 w-4 text-destructive" />
        <span className="text-xs font-medium text-destructive">Lead décliné</span>
      </div>
    );
  }

  async function respond(decision: "accepted" | "declined") {
    setLoading(decision);
    try {
      const { data, error } = await supabase.functions.invoke("contractor-respond-to-lead", {
        body: {
          matchId,
          decision,
          declineReason: decision === "declined" ? declineReason : undefined,
          declineCode: decision === "declined" ? declineCode : undefined,
        },
      });

      if (error || !data?.ok) {
        throw new Error(error?.message || data?.error || "Erreur");
      }

      if (decision === "accepted") {
        toast.success("Lead accepté ! Vous pouvez planifier un rendez-vous.");
      } else {
        toast.info(
          data.escalated
            ? "Lead décliné — transmis au prochain entrepreneur."
            : "Lead décliné — aucun autre entrepreneur disponible."
        );
      }

      onDecision?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur inattendue";
      toast.error(msg);
    } finally {
      setLoading(null);
      setShowDecline(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1 text-xs rounded-xl"
          onClick={() => respond("accepted")}
          disabled={loading !== null}
        >
          {loading === "accepted" ? (
            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5 mr-1" />
          )}
          Accepter
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-xs rounded-xl"
          onClick={() => setShowDecline((v) => !v)}
          disabled={loading !== null}
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Décliner
          {showDecline ? (
            <ChevronUp className="h-3 w-3 ml-1" />
          ) : (
            <ChevronDown className="h-3 w-3 ml-1" />
          )}
        </Button>
      </div>

      {showDecline && (
        <div className="rounded-xl border border-border/30 bg-background/50 p-3 space-y-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Raison du refus
          </p>
          <div className="flex flex-wrap gap-1.5">
            {DECLINE_CODES.map((rc) => (
              <Badge
                key={rc.code}
                variant={declineCode === rc.code ? "default" : "secondary"}
                className="text-[10px] cursor-pointer"
                onClick={() => setDeclineCode(rc.code)}
              >
                {rc.label}
              </Badge>
            ))}
          </div>

          {declineCode === "other" && (
            <Textarea
              placeholder="Précisez la raison…"
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              className="min-h-[50px] text-xs rounded-xl"
            />
          )}

          <Button
            size="sm"
            variant="destructive"
            className="w-full text-xs rounded-xl"
            disabled={!declineCode || loading !== null}
            onClick={() => respond("declined")}
          >
            {loading === "declined" ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : null}
            Confirmer le refus
          </Button>
        </div>
      )}
    </div>
  );
}
