/**
 * UNPRO — Admin: Bulk-assign prospects to affiliates
 * Route: /admin/affiliates/assign
 */
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, Users, Search, X } from "lucide-react";

interface Prospect {
  id: string;
  business_name: string;
  city: string | null;
  category: string | null;
  ai_score: number | null;
  outreach_status: string;
  assigned_affiliate_id: string | null;
  phone: string | null;
}

interface Affiliate {
  id: string;
  display_name: string;
  city: string | null;
  commission_pct: number | null;
}

export default function PageAffiliateAssignment() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState<"all" | "unassigned" | "assigned">("unassigned");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetAffiliate, setTargetAffiliate] = useState<string>("");

  const affiliates = useQuery({
    queryKey: ["affiliates-active"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("affiliates")
        .select("id, name, first_name, last_name, primary_city, commission_pct, status")
        .in("status", ["active", "training", "admin"])
        .order("name");
      if (error) throw error;
      return ((data ?? []) as any[]).map((a) => ({
        id: a.id,
        display_name: [a.first_name, a.last_name].filter(Boolean).join(" ").trim() || a.name || "Sans nom",
        city: a.primary_city ?? null,
        commission_pct: a.commission_pct ?? null,
      })) as Affiliate[];
    },
  });

  const prospects = useQuery({
    queryKey: ["assignable-prospects", search, cityFilter, assignmentFilter],
    queryFn: async () => {
      let q = supabase
        .from("contractors_prospects")
        .select("id, business_name, city, category, ai_score, outreach_status, assigned_affiliate_id, phone")
        .order("ai_score", { ascending: false, nullsFirst: false })
        .limit(300);
      if (search) q = q.ilike("business_name", `%${search}%`);
      if (cityFilter) q = q.ilike("city", `%${cityFilter}%`);
      if (assignmentFilter === "unassigned") q = q.is("assigned_affiliate_id", null);
      if (assignmentFilter === "assigned") q = q.not("assigned_affiliate_id", "is", null);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Prospect[];
    },
  });

  const affiliateMap = useMemo(() => {
    const m = new Map<string, string>();
    (affiliates.data ?? []).forEach((a) => m.set(a.user_id, a.display_name));
    return m;
  }, [affiliates.data]);

  const assign = useMutation({
    mutationFn: async ({ ids, affiliateId }: { ids: string[]; affiliateId: string | null }) => {
      const { error } = await supabase
        .from("contractors_prospects")
        .update({ assigned_affiliate_id: affiliateId })
        .in("id", ids);
      if (error) throw error;

      if (affiliateId) {
        const rows = ids.map((prospect_id) => ({
          prospect_id,
          affiliate_id: affiliateId,
          status: "to_call" as const,
        }));
        await supabase.from("affiliate_assignments").upsert(rows, {
          onConflict: "prospect_id,affiliate_id",
          ignoreDuplicates: true,
        });
      }
    },
    onSuccess: (_, vars) => {
      toast.success(
        vars.affiliateId
          ? `${vars.ids.length} prospect(s) assigné(s)`
          : `${vars.ids.length} prospect(s) retiré(s)`,
      );
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["assignable-prospects"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur d'assignation"),
  });

  const rows = prospects.data ?? [];
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleAssign = () => {
    if (!targetAffiliate || selected.size === 0) return;
    assign.mutate({ ids: Array.from(selected), affiliateId: targetAffiliate });
  };

  const handleUnassign = () => {
    if (selected.size === 0) return;
    assign.mutate({ ids: Array.from(selected), affiliateId: null });
  };

  return (
    <div className="admin-theme min-h-screen bg-background text-foreground p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Assignation des affiliés</h1>
            <p className="text-sm text-muted-foreground">
              Attribuer les prospects aux affiliés pour qu'ils apparaissent dans leur salle de guerre.
            </p>
          </div>
        </header>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Action groupée</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <Select value={targetAffiliate} onValueChange={setTargetAffiliate}>
              <SelectTrigger className="w-full sm:w-72">
                <SelectValue placeholder="Choisir un affilié…" />
              </SelectTrigger>
              <SelectContent>
                {(affiliates.data ?? []).map((a) => (
                  <SelectItem key={a.user_id} value={a.user_id}>
                    {a.display_name} · {Math.round(a.commission_rate * 100)}%
                  </SelectItem>
                ))}
                {affiliates.data?.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    Aucun affilié actif — créer un profil d'abord.
                  </div>
                )}
              </SelectContent>
            </Select>

            <Button
              onClick={handleAssign}
              disabled={!targetAffiliate || selected.size === 0 || assign.isPending}
              className="gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Assigner ({selected.size})
            </Button>
            <Button
              variant="outline"
              onClick={handleUnassign}
              disabled={selected.size === 0 || assign.isPending}
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Retirer l'assignation
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Nom d'entreprise…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Input
                placeholder="Ville…"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="w-full sm:w-48"
              />
              <Select value={assignmentFilter} onValueChange={(v: any) => setAssignmentFilter(v)}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Non assignés</SelectItem>
                  <SelectItem value="assigned">Déjà assignés</SelectItem>
                  <SelectItem value="all">Tous</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {prospects.isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Chargement…</div>
            ) : rows.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">Aucun prospect trouvé.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 border-b border-border/40">
                    <tr>
                      <th className="p-3 w-10">
                        <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                      </th>
                      <th className="p-3 text-left font-medium">Entreprise</th>
                      <th className="p-3 text-left font-medium">Ville · Catégorie</th>
                      <th className="p-3 text-left font-medium">Score</th>
                      <th className="p-3 text-left font-medium">Statut</th>
                      <th className="p-3 text-left font-medium">Affilié</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-border/20 hover:bg-muted/20 cursor-pointer"
                        onClick={() => toggle(r.id)}
                      >
                        <td className="p-3">
                          <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} />
                        </td>
                        <td className="p-3 font-medium">{r.business_name}</td>
                        <td className="p-3 text-muted-foreground">
                          {r.city || "—"} · {r.category || "—"}
                        </td>
                        <td className="p-3">{r.ai_score ?? "—"}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px]">
                            {r.outreach_status}
                          </Badge>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {r.assigned_affiliate_id ? (
                            <Badge variant="secondary" className="text-[10px]">
                              {affiliateMap.get(r.assigned_affiliate_id) ?? "assigné"}
                            </Badge>
                          ) : (
                            <span className="text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
