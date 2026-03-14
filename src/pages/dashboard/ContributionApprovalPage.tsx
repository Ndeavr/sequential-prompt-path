/**
 * UNPRO — Contribution Approval Page
 * Owner reviews contractor contributions with accept/reject flow.
 */

import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/layouts/DashboardLayout";
import { PageHeader } from "@/components/shared";
import { useAuth } from "@/hooks/useAuth";
import { getPropertyContributions, reviewContribution } from "@/services/qr";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2, XCircle, Clock, Wrench, User, Calendar,
  DollarSign, Camera, AlertCircle, ShieldCheck, Image,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  pending: { label: "En attente", icon: Clock, color: "text-warning" },
  approved: { label: "Approuvé", icon: CheckCircle2, color: "text-success" },
  rejected: { label: "Refusé", icon: XCircle, color: "text-destructive" },
  expired: { label: "Expiré", icon: AlertCircle, color: "text-muted-foreground" },
};

export default function ContributionApprovalPage() {
  const { id: propertyId } = useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const { data: contributions, isLoading } = useQuery({
    queryKey: ["contributions", propertyId],
    queryFn: () => getPropertyContributions(propertyId!),
    enabled: !!propertyId,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: "approved" | "rejected" }) => {
      await reviewContribution(id, decision, reviewNote, user?.id);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["contributions", propertyId] });
      toast.success(vars.decision === "approved"
        ? "Contribution approuvée et ajoutée au Passeport !"
        : "Contribution refusée."
      );
      setReviewingId(null);
      setReviewNote("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const pending = (contributions ?? []).filter((c: any) => c.status === "pending");
  const reviewed = (contributions ?? []).filter((c: any) => c.status !== "pending");

  return (
    <DashboardLayout>
      <PageHeader
        title="Contributions entrepreneurs"
        description="Approuvez ou refusez les contributions à votre Passeport Maison"
      />

      {/* Pending */}
      {pending.length > 0 && (
        <div className="space-y-3 mb-8">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-warning" />
            En attente d'approbation ({pending.length})
          </h3>
          {pending.map((c: any) => (
            <ContributionCard
              key={c.id}
              contribution={c}
              isReviewing={reviewingId === c.id}
              onStartReview={() => { setReviewingId(c.id); setReviewNote(""); }}
              onCancel={() => setReviewingId(null)}
              reviewNote={reviewNote}
              onNoteChange={setReviewNote}
              onApprove={() => reviewMutation.mutate({ id: c.id, decision: "approved" })}
              onReject={() => reviewMutation.mutate({ id: c.id, decision: "rejected" })}
              isSubmitting={reviewMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Reviewed */}
      {reviewed.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-muted-foreground">Historique</h3>
          {reviewed.map((c: any) => (
            <ContributionCard key={c.id} contribution={c} readOnly />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (contributions ?? []).length === 0 && (
        <Card className="glass-card border-0 p-8 text-center">
          <Wrench className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Aucune contribution reçue pour le moment.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Partagez le code QR de votre propriété avec vos entrepreneurs.
          </p>
        </Card>
      )}
    </DashboardLayout>
  );
}

function ContributionCard({
  contribution: c,
  isReviewing = false,
  readOnly = false,
  onStartReview,
  onCancel,
  reviewNote,
  onNoteChange,
  onApprove,
  onReject,
  isSubmitting,
}: {
  contribution: any;
  isReviewing?: boolean;
  readOnly?: boolean;
  onStartReview?: () => void;
  onCancel?: () => void;
  reviewNote?: string;
  onNoteChange?: (v: string) => void;
  onApprove?: () => void;
  onReject?: () => void;
  isSubmitting?: boolean;
}) {
  const status = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.pending;
  const StatusIcon = status.icon;
  const contractorName = c.contractors?.business_name ?? c.contributor_name ?? "Inconnu";
  const photoCount = (c.photo_paths ?? []).length;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="glass-card border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wrench className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{c.work_type}</p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <User className="h-2.5 w-2.5" /> {contractorName}
                </p>
              </div>
            </div>
            <Badge variant="outline" className={`text-[10px] ${status.color} border-current/20`}>
              <StatusIcon className="h-2.5 w-2.5 mr-1" />
              {status.label}
            </Badge>
          </div>

          {/* Details */}
          {c.work_description && (
            <p className="text-xs text-muted-foreground leading-relaxed">{c.work_description}</p>
          )}

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {c.work_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(c.work_date).toLocaleDateString("fr-CA")}
              </span>
            )}
            {c.cost_estimate != null && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {Number(c.cost_estimate).toLocaleString("fr-CA")} $
              </span>
            )}
            {photoCount > 0 && (
              <span className="flex items-center gap-1">
                <Image className="h-3 w-3" />
                {photoCount} photo{photoCount > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Review controls */}
          {!readOnly && c.status === "pending" && (
            <AnimatePresence>
              {isReviewing ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 pt-2 border-t border-border/30"
                >
                  <Textarea
                    value={reviewNote}
                    onChange={(e) => onNoteChange?.(e.target.value)}
                    placeholder="Note optionnelle…"
                    rows={2}
                    className="rounded-xl text-xs"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={onApprove}
                      disabled={isSubmitting}
                      className="flex-1 rounded-xl gap-1 bg-success hover:bg-success/90 text-success-foreground"
                    >
                      <CheckCircle2 className="h-3 w-3" /> Approuver
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={onReject}
                      disabled={isSubmitting}
                      className="flex-1 rounded-xl gap-1"
                    >
                      <XCircle className="h-3 w-3" /> Refuser
                    </Button>
                    <Button size="sm" variant="ghost" onClick={onCancel} className="rounded-xl">
                      Annuler
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onStartReview}
                  className="w-full rounded-xl gap-1 text-xs"
                >
                  <ShieldCheck className="h-3 w-3" /> Examiner cette contribution
                </Button>
              )}
            </AnimatePresence>
          )}

          {/* Review note if reviewed */}
          {c.owner_review_note && (
            <div className="p-2 rounded-lg bg-muted/30 text-[10px] text-muted-foreground">
              Note: {c.owner_review_note}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
