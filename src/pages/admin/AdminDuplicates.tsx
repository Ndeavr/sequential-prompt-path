/**
 * UNPRO — Admin Duplicate Detection & Entity Resolution
 * Review duplicate candidates, resolve flags, and trigger scans.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  GitMerge, AlertTriangle, ShieldCheck, Search, RefreshCw,
  CheckCircle, XCircle, Building, Flag, Eye,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/* ── Data hooks ── */
function useDuplicateCandidates(status: string) {
  return useQuery({
    queryKey: ["admin-duplicates", status],
    queryFn: async () => {
      const { data, error } = status === "all"
        ? await supabase
            .from("contractor_duplicate_candidates")
            .select("*")
            .order("duplicate_confidence_score", { ascending: false })
            .limit(200)
        : await supabase
            .from("contractor_duplicate_candidates")
            .select("*")
            .eq("review_status", status as any)
            .order("duplicate_confidence_score", { ascending: false })
            .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useEntityFlags() {
  return useQuery({
    queryKey: ["admin-entity-flags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_entity_flags")
        .select("*")
        .eq("is_resolved", false)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useContractorNames(ids: string[]) {
  return useQuery({
    queryKey: ["contractor-names", ids.join(",")],
    queryFn: async () => {
      if (ids.length === 0) return {};
      const { data } = await supabase
        .from("contractors")
        .select("id, business_name, city, admin_verified")
        .in("id", ids);
      const map: Record<string, any> = {};
      (data ?? []).forEach((c: any) => { map[c.id] = c; });
      return map;
    },
    enabled: ids.length > 0,
  });
}

/* ── Confidence badge ── */
function ConfidenceBadge({ score }: { score: number }) {
  if (score >= 85) return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Très probable</Badge>;
  if (score >= 60) return <Badge className="bg-warning/10 text-warning border-warning/20">Probable</Badge>;
  return <Badge className="bg-muted text-muted-foreground border-border">Possible</Badge>;
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: "bg-destructive/10 text-destructive border-destructive/20",
    high: "bg-warning/10 text-warning border-warning/20",
    medium: "bg-accent/10 text-accent border-accent/20",
    low: "bg-muted text-muted-foreground border-border",
  };
  return <Badge className={colors[severity] ?? colors.low}>{severity}</Badge>;
}

const REVIEW_OPTIONS = [
  { value: "confirmed_duplicate", label: "Confirmer doublon", icon: GitMerge },
  { value: "not_duplicate", label: "Pas un doublon", icon: XCircle },
  { value: "same_brand_separate_location", label: "Même marque, lieu différent", icon: Building },
  { value: "needs_more_proof", label: "Besoin de plus de preuves", icon: Search },
];

/* ═══════════════════════════════════ */

export default function AdminDuplicates() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("pending");
  const [reviewDialog, setReviewDialog] = useState<any | null>(null);
  const [reviewAction, setReviewAction] = useState("not_duplicate");
  const [reviewNotes, setReviewNotes] = useState("");
  const [scanning, setScanning] = useState(false);

  const { data: candidates, isLoading } = useDuplicateCandidates(tab);
  const { data: flags, isLoading: flagsLoading } = useEntityFlags();

  // Collect all contractor IDs for name resolution
  const allIds = new Set<string>();
  (candidates ?? []).forEach((c: any) => {
    allIds.add(c.contractor_id);
    allIds.add(c.candidate_contractor_id);
  });
  (flags ?? []).forEach((f: any) => allIds.add(f.contractor_id));
  const { data: names } = useContractorNames([...allIds]);

  const getName = (id: string) => (names as any)?.[id]?.business_name ?? id.slice(0, 8);
  const getCity = (id: string) => (names as any)?.[id]?.city ?? "";
  const isVerified = (id: string) => (names as any)?.[id]?.admin_verified === true;

  // Scan mutation
  const handleScan = async () => {
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("detect-duplicates");
      if (error) throw error;
      toast.success(`Scan terminé: ${data.candidates_found} candidats, ${data.flags_created} drapeaux`);
      qc.invalidateQueries({ queryKey: ["admin-duplicates"] });
      qc.invalidateQueries({ queryKey: ["admin-entity-flags"] });
    } catch (err: any) {
      toast.error(err.message ?? "Erreur lors du scan");
    } finally {
      setScanning(false);
    }
  };

  // Review mutation
  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("contractor_duplicate_candidates")
        .update({
          review_status: status,
          review_notes: notes || null,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Décision enregistrée.");
      qc.invalidateQueries({ queryKey: ["admin-duplicates"] });
      setReviewDialog(null);
      setReviewNotes("");
    },
  });

  // Resolve flag
  const resolveFlag = useMutation({
    mutationFn: async (flagId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("contractor_entity_flags")
        .update({ is_resolved: true, resolved_by: user?.id, resolved_at: new Date().toISOString() })
        .eq("id", flagId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Drapeau résolu.");
      qc.invalidateQueries({ queryKey: ["admin-entity-flags"] });
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <PageHeader
            title="Détection de doublons"
            description="Résolution d'entités et détection de profils suspects"
          />
          <Button onClick={handleScan} disabled={scanning} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
            {scanning ? "Scan en cours…" : "Lancer un scan"}
          </Button>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="pending">En attente</TabsTrigger>
            <TabsTrigger value="all">Tous</TabsTrigger>
            <TabsTrigger value="confirmed_duplicate">Confirmés</TabsTrigger>
            <TabsTrigger value="flags">Drapeaux</TabsTrigger>
          </TabsList>

          {/* ── Duplicate Candidates ── */}
          <TabsContent value={tab === "flags" ? "flags" : tab}>
            {tab !== "flags" && (
              <>
                {isLoading ? (
                  <LoadingState />
                ) : !candidates || candidates.length === 0 ? (
                  <EmptyState
                    icon={<CheckCircle className="h-8 w-8 text-success" />}
                    title="Aucun doublon détecté"
                    description="Lancez un scan pour vérifier les profils entrepreneurs."
                  />
                ) : (
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Entrepreneur A</TableHead>
                            <TableHead>Entrepreneur B</TableHead>
                            <TableHead>Confiance</TableHead>
                            <TableHead>Signaux</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead className="w-24">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(candidates as any[]).map((c: any) => (
                            <TableRow key={c.id}>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-medium text-sm">{getName(c.contractor_id)}</span>
                                  {isVerified(c.contractor_id) && <ShieldCheck className="h-3 w-3 text-success" />}
                                  <span className="text-[10px] text-muted-foreground">{getCity(c.contractor_id)}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-medium text-sm">{getName(c.candidate_contractor_id)}</span>
                                  {isVerified(c.candidate_contractor_id) && <ShieldCheck className="h-3 w-3 text-success" />}
                                  <span className="text-[10px] text-muted-foreground">{getCity(c.candidate_contractor_id)}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <ConfidenceBadge score={c.duplicate_confidence_score} />
                                <span className="ml-1.5 text-xs text-muted-foreground">{c.duplicate_confidence_score}%</span>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {(Array.isArray(c.reasons_json) ? c.reasons_json : []).slice(0, 3).map((r: any, i: number) => (
                                    <Badge key={i} variant="outline" className="text-[9px]">{r.signal}</Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px]">{c.review_status}</Badge>
                              </TableCell>
                              <TableCell>
                                {c.review_status === "pending" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => { setReviewDialog(c); setReviewAction("not_duplicate"); }}
                                  >
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* ── Entity Flags ── */}
            {tab === "flags" && (
              <>
                {flagsLoading ? (
                  <LoadingState />
                ) : !flags || flags.length === 0 ? (
                  <EmptyState
                    icon={<Flag className="h-8 w-8 text-muted-foreground" />}
                    title="Aucun drapeau actif"
                    description="Tous les profils suspects ont été résolus."
                  />
                ) : (
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Entrepreneur</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Sévérité</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="w-24">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(flags as any[]).map((f: any) => (
                            <TableRow key={f.id}>
                              <TableCell className="font-medium text-sm">{getName(f.contractor_id)}</TableCell>
                              <TableCell><Badge variant="outline" className="text-[10px]">{f.flag_type}</Badge></TableCell>
                              <TableCell><SeverityBadge severity={f.severity} /></TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{f.description}</TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => resolveFlag.mutate(f.id)}
                                  disabled={resolveFlag.isPending}
                                >
                                  <CheckCircle className="h-3 w-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* ── Review Dialog ── */}
        <Dialog open={!!reviewDialog} onOpenChange={() => setReviewDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GitMerge className="h-5 w-5 text-primary" />
                Résoudre le doublon potentiel
              </DialogTitle>
            </DialogHeader>

            {reviewDialog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Card className="p-3">
                    <p className="font-semibold text-sm">{getName(reviewDialog.contractor_id)}</p>
                    <p className="text-xs text-muted-foreground">{getCity(reviewDialog.contractor_id)}</p>
                    {isVerified(reviewDialog.contractor_id) && (
                      <Badge className="mt-1 text-[9px] bg-success/10 text-success">Validé UnPRO</Badge>
                    )}
                  </Card>
                  <Card className="p-3">
                    <p className="font-semibold text-sm">{getName(reviewDialog.candidate_contractor_id)}</p>
                    <p className="text-xs text-muted-foreground">{getCity(reviewDialog.candidate_contractor_id)}</p>
                    {isVerified(reviewDialog.candidate_contractor_id) && (
                      <Badge className="mt-1 text-[9px] bg-success/10 text-success">Validé UnPRO</Badge>
                    )}
                  </Card>
                </div>

                <div>
                  <p className="text-xs font-semibold mb-1.5">Signaux détectés</p>
                  <div className="space-y-1">
                    {(Array.isArray(reviewDialog.reasons_json) ? reviewDialog.reasons_json : []).map((r: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <AlertTriangle className="h-3 w-3 text-warning shrink-0" />
                        <span className="text-muted-foreground">{r.detail}</span>
                        <Badge variant="outline" className="ml-auto text-[8px]">{r.weight}pts</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <Select value={reviewAction} onValueChange={setReviewAction}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REVIEW_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Textarea
                  placeholder="Notes (optionnel)"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                />

                {/* Warning for verified contractors */}
                {(isVerified(reviewDialog.contractor_id) || isVerified(reviewDialog.candidate_contractor_id)) && reviewAction === "confirmed_duplicate" && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <p className="text-xs text-destructive">
                      Un ou plusieurs de ces profils sont validés par UnPRO. La fusion nécessite une attention particulière.
                    </p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setReviewDialog(null)}>Annuler</Button>
              <Button
                onClick={() =>
                  reviewMutation.mutate({
                    id: reviewDialog.id,
                    status: reviewAction,
                    notes: reviewNotes,
                  })
                }
                disabled={reviewMutation.isPending}
              >
                Enregistrer la décision
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
