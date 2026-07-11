/**
 * PageAdminAcquisitionDuplicates — /admin/acquisition/duplicates
 * Review queue for MEDIUM-confidence dedupe matches.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, GitMerge, X, Copy, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

type Review = {
  id: string;
  candidate_prospect_id: string | null;
  existing_prospect_id: string | null;
  confidence: number;
  signals: Record<string, boolean>;
  new_payload: Record<string, any>;
  status: string;
  created_at: string;
  candidate?: any;
  existing?: any;
};

const SIGNAL_LABELS: Record<string, string> = {
  google_place_id: "Google Place",
  rbq: "RBQ",
  normalized_domain: "Domaine",
  phone_city: "Tél + ville",
  address_name: "Adresse + nom",
  fuzzy_name: "Nom similaire",
};

export default function PageAdminAcquisitionDuplicates() {
  const qc = useQueryClient();

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["dedupe-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospect_dedupe_reviews")
        .select("*")
        .eq("status", "pending")
        .order("confidence", { ascending: false })
        .limit(200);
      if (error) throw error;

      // Hydrate candidate + existing
      const ids = Array.from(new Set(
        (data ?? []).flatMap((r: any) =>
          [r.candidate_prospect_id, r.existing_prospect_id].filter(Boolean)
        ),
      ));
      if (ids.length === 0) return [];
      const { data: pros } = await supabase
        .from("contractor_prospects")
        .select("id, business_name, city, phone, website_url, address, review_count, review_rating")
        .in("id", ids as string[]);
      const map = new Map((pros ?? []).map((p: any) => [p.id, p]));
      return (data ?? []).map((r: any) => ({
        ...r,
        candidate: map.get(r.candidate_prospect_id),
        existing: map.get(r.existing_prospect_id),
      })) as Review[];
    },
  });

  const decide = useMutation({
    mutationFn: async ({ review, action }: { review: Review; action: "merge" | "reject" | "keep_both" }) => {
      if (action === "merge" && review.candidate_prospect_id && review.existing_prospect_id) {
        // Atomic merge — reparents all child records and writes an audit log
        const { error } = await supabase.rpc("merge_contractor_prospects", {
          p_keep_id: review.existing_prospect_id,
          p_drop_id: review.candidate_prospect_id,
          p_admin_id: null,
          p_reason: `dedupe_review:${review.id}`,
        });
        if (error) throw error;
      } else if (action === "keep_both" && review.candidate_prospect_id) {
        await supabase.from("contractor_prospects")
          .update({ ingestion_status: "inserted", needs_review: false })
          .eq("id", review.candidate_prospect_id);
      } else if (action === "reject" && review.candidate_prospect_id) {
        await supabase.from("contractor_prospects").delete().eq("id", review.candidate_prospect_id);
      }
      await supabase.from("prospect_dedupe_reviews").update({
        status: action === "merge" ? "merged" : action === "reject" ? "rejected" : "kept_both",
        reviewed_at: new Date().toISOString(),
      }).eq("id", review.id);
    },
    onSuccess: () => {
      toast.success("Décision enregistrée");
      qc.invalidateQueries({ queryKey: ["dedupe-reviews"] });
      qc.invalidateQueries({ queryKey: ["integrity-report"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Échec"),
  });

  const { data: integrity } = useQuery({
    queryKey: ["integrity-report"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("pipeline_data_integrity_report");
      if (error) throw error;
      return data as Record<string, any>;
    },
    refetchInterval: 30_000,
  });

  const runBulkDedupe = useMutation({
    mutationFn: async (dryRun: boolean) => {
      const { data, error } = await supabase.functions.invoke("dedupe-acquisition-contacts", {
        body: { limit: 500, auto_merge_threshold: 0.95, dry_run: dryRun },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (d: any) => {
      toast.success(
        d?.dry_run
          ? `Analyse : ${d.new_review_candidates} candidats détectés, ${d.auto_merge_candidates} fusionnables auto.`
          : `Fusion exécutée : ${d.merges?.length ?? 0} fusions.`,
      );
      qc.invalidateQueries({ queryKey: ["dedupe-reviews"] });
      qc.invalidateQueries({ queryKey: ["integrity-report"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Échec du scan"),
  });

  return (
    <div className="min-h-screen bg-background p-4 lg:p-8">
      <Helmet><title>Doublons probables · UNPRO Admin</title></Helmet>

      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link to="/admin/acquisition-machine" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Machine d'acquisition
            </Link>
            <h1 className="text-2xl font-semibold mt-1">Doublons probables</h1>
            <p className="text-sm text-muted-foreground">
              Confiance 0.60 – 0.89 — décision humaine requise.
            </p>
          </div>
          <Badge variant="secondary">
            {reviews?.length ?? 0} en attente
          </Badge>
        </div>

        {/* Data Integrity + bulk actions */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-medium">Intégrité des données</div>
              <div className="text-xs text-muted-foreground">Normalisation, doublons et contacts orphelins.</div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => runBulkDedupe.mutate(true)} disabled={runBulkDedupe.isPending}>
                Scan (dry-run)
              </Button>
              <Button size="sm" onClick={() => runBulkDedupe.mutate(false)} disabled={runBulkDedupe.isPending}>
                {runBulkDedupe.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Fusion auto ≥ 95%"}
              </Button>
            </div>
          </div>
          {integrity && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <Metric label="Prospects" value={integrity.prospects_total} />
              <Metric label="Leads" value={integrity.leads_total} />
              <Metric label="Doublons haute conf." value={integrity.prospects_dup_high_conf} tone={integrity.prospects_dup_high_conf > 0 ? "warn" : "ok"} />
              <Metric label="Doublons en revue" value={integrity.prospects_dup_pending} />
              <Metric label="Prospects sans tél E.164" value={integrity.prospects_missing_phone_e164} tone={integrity.prospects_missing_phone_e164 > 0 ? "warn" : "ok"} />
              <Metric label="Prospects sans email norm." value={integrity.prospects_missing_email_norm} />
              <Metric label="Leads sans tél E.164" value={integrity.leads_missing_phone_e164} />
              <Metric label="Contacts orphelins" value={integrity.orphan_prospect_contacts} tone={integrity.orphan_prospect_contacts > 0 ? "warn" : "ok"} />
            </div>
          )}
        </Card>


        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !reviews || reviews.length === 0 ? (
          <Card className="p-12 text-center text-sm text-muted-foreground">
            Aucun doublon en attente. Le moteur tourne proprement.
          </Card>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge variant="outline">Confiance {Math.round(r.confidence * 100)}%</Badge>
                  {Object.entries(r.signals).filter(([, v]) => v).map(([k]) => (
                    <Badge key={k} variant="secondary" className="text-xs">
                      {SIGNAL_LABELS[k] ?? k}
                    </Badge>
                  ))}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(r.created_at).toLocaleString("fr-CA")}
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-3 mb-3">
                  <ProspectMini label="Nouveau candidat" p={r.candidate ?? r.new_payload} />
                  <ProspectMini label="Existant" p={r.existing} />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => decide.mutate({ review: r, action: "merge" })} disabled={decide.isPending}>
                    <GitMerge className="h-3 w-3 mr-1" /> Fusionner dans l'existant
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => decide.mutate({ review: r, action: "keep_both" })} disabled={decide.isPending}>
                    <Copy className="h-3 w-3 mr-1" /> Conserver les deux
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => decide.mutate({ review: r, action: "reject" })} disabled={decide.isPending}>
                    <X className="h-3 w-3 mr-1" /> Rejeter le candidat
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProspectMini({ label, p }: { label: string; p: any }) {
  if (!p) return (
    <div className="border rounded-md p-3 text-xs text-muted-foreground">
      {label} : introuvable
    </div>
  );
  return (
    <div className="border rounded-md p-3 space-y-1 text-sm">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-medium">{p.business_name ?? "—"}</div>
      <div className="text-xs text-muted-foreground">{p.city ?? "—"} · {p.phone ?? "—"}</div>
      <div className="text-xs text-muted-foreground truncate">{p.address ?? p.website_url ?? "—"}</div>
      {p.review_count != null && (
        <div className="text-xs text-muted-foreground">
          ★ {p.review_rating ?? "—"} ({p.review_count} avis)
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: any; tone?: "ok" | "warn" | "neutral" }) {
  const color = tone === "warn" ? "text-amber-600" : tone === "ok" ? "text-emerald-600" : "text-foreground";
  return (
    <div className="border rounded-md p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold ${color}`}>{value ?? "—"}</div>
    </div>
  );
}
