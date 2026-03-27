/**
 * UNPRO — Prospection Prospects List
 * Full prospect management with filters, scores, and actions.
 */
import { useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, ExternalLink, Globe, Phone, Mail, Star,
  Users, Target, CheckCircle2, AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

const STATUS_COLORS: Record<string, string> = {
  discovered: "bg-gray-500/20 text-gray-400",
  imported: "bg-blue-500/20 text-blue-400",
  normalized: "bg-indigo-500/20 text-indigo-400",
  scored: "bg-violet-500/20 text-violet-400",
  queued_for_outreach: "bg-cyan-500/20 text-cyan-400",
  contacted: "bg-amber-500/20 text-amber-400",
  opened: "bg-orange-500/20 text-orange-400",
  clicked: "bg-pink-500/20 text-pink-400",
  started_onboarding: "bg-emerald-500/20 text-emerald-400",
  converted: "bg-green-600/20 text-green-300",
  ignored: "bg-gray-600/20 text-gray-500",
  failed: "bg-red-500/20 text-red-400",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "text-red-400",
  medium: "text-amber-400",
  low: "text-blue-400",
};

const AdminProspectionProspects = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("");

  const { data: prospects, isLoading } = useQuery({
    queryKey: ["prospection-prospects", statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("prospects")
        .select("*")
        .order("aipp_pre_score", { ascending: false })
        .limit(500);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const filtered = (prospects ?? []).filter((p: any) => {
    if (search && !p.business_name?.toLowerCase().includes(search.toLowerCase()) && !p.slug?.toLowerCase().includes(search.toLowerCase())) return false;
    if (cityFilter && !p.main_city?.toLowerCase().includes(cityFilter.toLowerCase())) return false;
    return true;
  });

  return (
    <AdminLayout>
      <PageHeader title="Prospects — Moteur de Prospection" description="Tous les prospects découverts, scorés et en conversion" />

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total", value: prospects?.length ?? 0, icon: Users },
          { label: "Scorés", value: (prospects ?? []).filter((p: any) => Number(p.aipp_pre_score) > 0).length, icon: Target },
          { label: "Contactés", value: (prospects ?? []).filter((p: any) => ["contacted", "opened", "clicked", "started_onboarding", "converted"].includes(p.status)).length, icon: Mail },
          { label: "Convertis", value: (prospects ?? []).filter((p: any) => p.status === "converted").length, icon: CheckCircle2 },
        ].map((s) => (
          <Card key={s.label} className="bg-card/60 backdrop-blur">
            <CardContent className="p-3 flex items-center gap-2">
              <s.icon className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher par nom..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Input placeholder="Ville..." className="w-[140px]" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            {Object.keys(STATUS_COLORS).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
                <th className="text-center p-3 font-medium text-muted-foreground">AIPP</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Signaux</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Priorité</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Statut</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Dedup</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p: any) => (
                <tr key={p.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                  <td className="p-3">
                    <div className="font-medium">{p.business_name}</div>
                    {p.slug && <div className="text-xs text-muted-foreground">{p.slug}</div>}
                  </td>
                  <td className="p-3 text-muted-foreground">{p.main_city ?? "—"}</td>
                  <td className="p-3 text-center">
                    {Number(p.aipp_pre_score) > 0 ? (
                      <span className={`font-bold ${Number(p.aipp_pre_score) >= 70 ? "text-green-400" : Number(p.aipp_pre_score) >= 50 ? "text-amber-400" : "text-red-400"}`}>
                        {Math.round(Number(p.aipp_pre_score))}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="p-3">
                    <div className="flex justify-center gap-1">
                      {p.has_website && <Globe className="h-3.5 w-3.5 text-blue-400" />}
                      {p.has_phone && <Phone className="h-3.5 w-3.5 text-green-400" />}
                      {p.has_email && <Mail className="h-3.5 w-3.5 text-amber-400" />}
                      {p.has_reviews && <Star className="h-3.5 w-3.5 text-yellow-400" />}
                      {p.has_google_presence && <Target className="h-3.5 w-3.5 text-violet-400" />}
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`font-medium text-xs ${PRIORITY_COLORS[p.priority_level] ?? "text-muted-foreground"}`}>
                      {p.priority_level}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <Badge className={`text-xs ${STATUS_COLORS[p.status] ?? ""}`}>{p.status}</Badge>
                  </td>
                  <td className="p-3 text-center">
                    {p.dedup_status === "clean" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-400 mx-auto" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 text-amber-400 mx-auto" />
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <Link to={`/admin/prospection/prospects/${p.id}`}>
                      <Button variant="ghost" size="sm"><ExternalLink className="h-3.5 w-3.5" /></Button>
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">{isLoading ? "Chargement..." : "Aucun prospect trouvé."}</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminProspectionProspects;
