import { useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Upload, Target, Mail, ExternalLink, Search, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-gray-500/20 text-gray-400",
  scraped: "bg-blue-500/20 text-blue-400",
  enriched: "bg-indigo-500/20 text-indigo-400",
  scored: "bg-violet-500/20 text-violet-400",
  landing_ready: "bg-emerald-500/20 text-emerald-400",
  emailed: "bg-amber-500/20 text-amber-400",
  opened: "bg-orange-500/20 text-orange-400",
  clicked: "bg-pink-500/20 text-pink-400",
  booked: "bg-green-500/20 text-green-400",
  won: "bg-green-600/20 text-green-300",
  lost: "bg-red-500/20 text-red-400",
};

const PRIORITY_COLORS: Record<string, string> = {
  A: "bg-red-500/20 text-red-400 border-red-500/30",
  B: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  C: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  D: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const AdminProspects = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");

  const { data: prospects, isLoading } = useQuery({
    queryKey: ["prospects", statusFilter, categoryFilter, cityFilter],
    queryFn: async () => {
      let q = supabase
        .from("contractors_prospects")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      if (categoryFilter !== "all") q = q.eq("category", categoryFilter);
      if (cityFilter !== "all") q = q.eq("city", cityFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["prospect-stats"],
    queryFn: async () => {
      const { data } = await supabase.from("contractors_prospects").select("status, aipp_score");
      if (!data) return null;
      return {
        total: data.length,
        scored: data.filter((d: any) => d.aipp_score != null).length,
        emailed: data.filter((d: any) => ["emailed", "opened", "clicked", "replied", "booked", "won"].includes(d.status)).length,
        booked: data.filter((d: any) => ["booked", "won"].includes(d.status)).length,
        avgScore: data.filter((d: any) => d.aipp_score).length > 0
          ? Math.round(data.filter((d: any) => d.aipp_score).reduce((s: number, d: any) => s + d.aipp_score, 0) / data.filter((d: any) => d.aipp_score).length)
          : 0,
      };
    },
  });

  const filtered = (prospects ?? []).filter((p: any) =>
    !search || p.business_name?.toLowerCase().includes(search.toLowerCase()) || p.domain?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <PageHeader title="Acquisition — Prospects" description="Moteur d'acquisition AIPP pour entrepreneurs" />

      {/* KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Total", value: stats?.total ?? 0, icon: Users },
          { label: "Scorés", value: stats?.scored ?? 0, icon: Target },
          { label: "Contactés", value: stats?.emailed ?? 0, icon: Mail },
          { label: "Bookés", value: stats?.booked ?? 0, icon: BarChart3 },
          { label: "Score moy.", value: stats?.avgScore ?? "—", icon: Target },
        ].map((s) => (
          <Card key={s.label} className="bg-card/60 backdrop-blur">
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className="h-4 w-4 text-primary" />
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Link to="/admin/prospects/import">
          <Button variant="outline" size="sm"><Upload className="h-3.5 w-3.5 mr-1.5" />Importer CSV</Button>
        </Link>
        <Link to="/admin/prospects/campaigns">
          <Button variant="outline" size="sm"><Mail className="h-3.5 w-3.5 mr-1.5" />Campagnes email</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            {Object.keys(STATUS_COLORS).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Catégorie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            {["toiture", "isolation", "pavage", "plomberie", "électricité", "rénovation", "paysagement", "fenêtres"].map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Entreprise</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Ville</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Catégorie</th>
                <th className="text-center p-3 font-medium text-muted-foreground">AIPP</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Priorité</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Statut</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p: any) => (
                <tr key={p.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                  <td className="p-3">
                    <div className="font-medium">{p.business_name}</div>
                    {p.domain && <div className="text-xs text-muted-foreground">{p.domain}</div>}
                  </td>
                  <td className="p-3 text-muted-foreground">{p.city ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{p.category ?? "—"}</td>
                  <td className="p-3 text-center">
                    {p.aipp_score != null ? (
                      <span className={`font-bold ${p.aipp_score >= 70 ? "text-green-400" : p.aipp_score >= 50 ? "text-amber-400" : "text-red-400"}`}>
                        {p.aipp_score}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="p-3 text-center">
                    <Badge variant="outline" className={`text-xs ${PRIORITY_COLORS[p.priority_tier] ?? ""}`}>{p.priority_tier}</Badge>
                  </td>
                  <td className="p-3 text-center">
                    <Badge className={`text-xs ${STATUS_COLORS[p.status] ?? ""}`}>{p.status}</Badge>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      {p.landing_slug && (
                        <Link to={`/audit/${p.landing_slug}`} target="_blank">
                          <Button variant="ghost" size="sm"><ExternalLink className="h-3.5 w-3.5" /></Button>
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">{isLoading ? "Chargement..." : "Aucun prospect trouvé."}</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminProspects;
