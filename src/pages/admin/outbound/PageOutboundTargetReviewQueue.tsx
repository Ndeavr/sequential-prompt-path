import { useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Rocket, MapPin, TrendingUp, Filter, ArrowLeft, Zap } from "lucide-react";

const approvalBadge = (s: string) => {
  const m: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    pending: { variant: "outline", label: "En attente" },
    approved: { variant: "default", label: "Approuvé" },
    rejected: { variant: "destructive", label: "Rejeté" },
    launched: { variant: "secondary", label: "Lancé" },
  };
  const v = m[s] || { variant: "outline" as const, label: s };
  return <Badge variant={v.variant}>{v.label}</Badge>;
};

export default function PageOutboundTargetReviewQueue() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const listId = params.get("list");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<string>("all");

  const { data: items, isLoading } = useQuery({
    queryKey: ["agent-target-items", listId],
    queryFn: async () => {
      let q = supabase.from("agent_target_items").select("*").order("priority_score", { ascending: false });
      if (listId) q = q.eq("target_list_id", listId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const selectAll = () => {
    if (!items) return;
    const filtered = getFiltered();
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((i) => i.id)));
    }
  };

  const bulkApprove = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selected);
      for (const id of ids) {
        await supabase.from("agent_target_items").update({ approval_status: "approved" }).eq("id", id);
      }
      // Generate campaigns for each approved item
      for (const id of ids) {
        const item = items?.find((i) => i.id === id);
        if (!item) continue;
        const { data: campaign } = await supabase.from("outbound_campaigns").insert({
          campaign_name: `${item.service_name} — ${item.city_name}`,
          city: item.city_name || "",
          specialty: item.specialty_slug || "",
          campaign_status: "draft",
          goal: `Acquisition ${item.service_name} à ${item.city_name}`,
          target_lead_count: item.estimated_lead_volume || 50,
          auto_scraping_enabled: true,
          auto_sending_enabled: true,
          daily_send_limit: 30,
          hourly_send_limit: 10,
          agent_target_item_id: item.id,
        }).select().single();

        if (campaign) {
          await supabase.from("agent_target_items").update({ campaign_id: campaign.id }).eq("id", id);
          // Create recommendation
          await supabase.from("outbound_autopilot_recommendations").insert({
            agent_target_item_id: id,
            predicted_city: item.city_name,
            predicted_specialty: item.specialty_slug,
            predicted_max_leads: item.estimated_lead_volume || 50,
            predicted_daily_send_limit: 30,
            predicted_hourly_send_limit: 10,
            confidence_score: 75 + Math.random() * 20,
          });
        }
      }
      if (listId) {
        const approvedCount = ids.length;
        await supabase.from("agent_target_lists").update({ status: "review_ready", approved_count: approvedCount }).eq("id", listId);
      }
    },
    onSuccess: () => {
      toast.success(`${selected.size} marchés approuvés et campagnes générées`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["agent-target-items"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkReject = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selected);
      for (const id of ids) {
        await supabase.from("agent_target_items").update({ approval_status: "rejected" }).eq("id", id);
      }
    },
    onSuccess: () => {
      toast.success(`${selected.size} marchés rejetés`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["agent-target-items"] });
    },
  });

  const launchBatch = useMutation({
    mutationFn: async () => {
      const approved = items?.filter((i) => i.approval_status === "approved" && i.campaign_id) || [];
      if (!approved.length) throw new Error("Aucun marché approuvé à lancer");

      for (const item of approved) {
        await supabase.from("outbound_autopilot_runs").insert({
          target_list_id: listId || undefined,
          agent_target_item_id: item.id,
          campaign_id: item.campaign_id,
          status: "running",
          current_stage: "scraping",
          priority_score: item.priority_score || 50,
        });
        await supabase.from("agent_target_items").update({ approval_status: "launched" }).eq("id", item.id);
        if (item.campaign_id) {
          await supabase.from("outbound_campaigns").update({ campaign_status: "scraping" }).eq("id", item.campaign_id);
        }
      }
      if (listId) {
        await supabase.from("agent_target_lists").update({ status: "running" }).eq("id", listId);
      }
    },
    onSuccess: () => {
      toast.success("Lot lancé ! Les campagnes démarrent automatiquement.");
      qc.invalidateQueries({ queryKey: ["agent-target-items"] });
      navigate("/admin/outbound/autopilot/runs");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const getFiltered = () => {
    if (!items) return [];
    if (filter === "all") return items;
    return items.filter((i) => i.approval_status === filter);
  };

  const filtered = getFiltered();
  const approvedCount = items?.filter((i) => i.approval_status === "approved").length || 0;

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/outbound/targets")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">Révision des marchés</h1>
              <p className="text-sm text-muted-foreground">{items?.length || 0} marchés à revoir</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {selected.size > 0 && (
              <>
                <Button variant="success" size="sm" onClick={() => bulkApprove.mutate()}>
                  <CheckCircle className="h-3 w-3 mr-1" /> Approuver ({selected.size})
                </Button>
                <Button variant="destructive" size="sm" onClick={() => bulkReject.mutate()}>
                  <XCircle className="h-3 w-3 mr-1" /> Rejeter ({selected.size})
                </Button>
              </>
            )}
            {approvedCount > 0 && (
              <Button variant="premium" size="sm" onClick={() => launchBatch.mutate()}>
                <Rocket className="h-3 w-3 mr-1" /> Démarrer {approvedCount} marchés
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "all", label: "Tous" },
            { key: "pending", label: "En attente" },
            { key: "approved", label: "Approuvés" },
            { key: "rejected", label: "Rejetés" },
          ].map((f) => (
            <Button
              key={f.key}
              variant={filter === f.key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : !filtered.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <Filter className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>Aucun marché trouvé</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={selectAll} className="rounded" />
                    </TableHead>
                    <TableHead>Marché</TableHead>
                    <TableHead className="hidden md:table-cell">Ville</TableHead>
                    <TableHead className="hidden md:table-cell">Priorité</TableHead>
                    <TableHead className="hidden md:table-cell">Vol. estimé</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.id} className={selected.has(item.id) ? "bg-primary/5" : ""}>
                      <TableCell>
                        <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} className="rounded" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Zap className="h-3.5 w-3.5 text-primary" />
                          <div>
                            <p className="font-medium text-sm">{item.service_name || item.raw_label}</p>
                            <p className="text-xs text-muted-foreground md:hidden flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {item.city_name || "—"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground" /> {item.city_name || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1.5">
                          <TrendingUp className="h-3 w-3 text-primary" />
                          <span className="text-sm font-semibold">{item.priority_score || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{item.estimated_lead_volume || "—"}</TableCell>
                      <TableCell>{approvalBadge(item.approval_status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
