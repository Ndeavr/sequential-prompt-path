import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Search, Filter, ArrowUpDown, Building2, MapPin, Target,
  CheckCircle, XCircle, Send, Eye, ChevronDown
} from "lucide-react";

const crmStatusLabels: Record<string, { label: string; color: string }> = {
  new: { label: "Nouveau", color: "bg-slate-500/20 text-slate-300" },
  imported: { label: "Importé", color: "bg-blue-500/20 text-blue-300" },
  enriched: { label: "Enrichi", color: "bg-cyan-500/20 text-cyan-300" },
  scored: { label: "Scoré", color: "bg-indigo-500/20 text-indigo-300" },
  approved_to_send: { label: "Approuvé", color: "bg-violet-500/20 text-violet-300" },
  in_sequence: { label: "En séquence", color: "bg-emerald-500/20 text-emerald-300" },
  replied_positive: { label: "Réponse +", color: "bg-green-500/20 text-green-300" },
  replied_neutral: { label: "Neutre", color: "bg-amber-500/20 text-amber-300" },
  replied_negative: { label: "Réponse −", color: "bg-orange-500/20 text-orange-300" },
  meeting_booked: { label: "Meeting", color: "bg-purple-500/20 text-purple-300" },
  converted: { label: "Converti", color: "bg-emerald-600/20 text-emerald-300" },
  bounced: { label: "Bounced", color: "bg-red-500/20 text-red-300" },
  unsubscribed: { label: "Unsub", color: "bg-red-500/20 text-red-300" },
  suppressed: { label: "Supprimé", color: "bg-muted text-muted-foreground" },
  closed_lost: { label: "Fermé", color: "bg-muted text-muted-foreground" },
};

export default function PageOutboundLeadsQueue() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCity, setFilterCity] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState<"priority" | "status" | "city">("priority");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [l, co, ct, ca] = await Promise.all([
      supabase.from("outbound_leads").select("*").order("total_priority_score", { ascending: false }),
      supabase.from("outbound_companies").select("id, company_name, city, specialty, google_rating, rbq_number"),
      supabase.from("outbound_contacts").select("id, full_name, email, role_title"),
      supabase.from("outbound_campaigns").select("id, campaign_name, city, specialty"),
    ]);
    setLeads(l.data || []);
    setCompanies(co.data || []);
    setContacts(ct.data || []);
    setCampaigns(ca.data || []);
    setLoading(false);
  }

  const cities = useMemo(() => [...new Set(companies.map(c => c.city).filter(Boolean))], [companies]);

  const enrichedLeads = useMemo(() => {
    return leads.map(l => {
      const company = companies.find(c => c.id === l.company_id);
      const contact = contacts.find(c => c.id === l.contact_id);
      const campaign = campaigns.find(c => c.id === l.campaign_id);
      return { ...l, company, contact, campaign };
    });
  }, [leads, companies, contacts, campaigns]);

  const filtered = useMemo(() => {
    let result = enrichedLeads;
    if (filterCity !== "all") result = result.filter(l => l.company?.city === filterCity);
    if (filterStatus !== "all") result = result.filter(l => l.crm_status === filterStatus);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        l.company?.company_name?.toLowerCase().includes(q) ||
        l.contact?.full_name?.toLowerCase().includes(q) ||
        l.contact?.email?.toLowerCase().includes(q)
      );
    }
    if (sortBy === "priority") result.sort((a, b) => (b.total_priority_score || 0) - (a.total_priority_score || 0));
    else if (sortBy === "city") result.sort((a, b) => (a.company?.city || "").localeCompare(b.company?.city || ""));
    return result;
  }, [enrichedLeads, filterCity, filterStatus, search, sortBy]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate("/admin/outbound")}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Retour
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Leads Queue</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} leads · Triés par priorité</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Entreprise, contact, email…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        <select className="border border-border rounded-md px-3 py-2 text-sm bg-background" value={filterCity} onChange={e => setFilterCity(e.target.value)}>
          <option value="all">Toutes les villes</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select className="border border-border rounded-md px-3 py-2 text-sm bg-background" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">Tous les statuts</option>
          {Object.entries(crmStatusLabels).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        <Button variant="outline" size="sm" onClick={() => setSortBy(s => s === "priority" ? "city" : "priority")}>
          <ArrowUpDown className="h-3 w-3 mr-1" /> {sortBy === "priority" ? "Priorité" : "Ville"}
        </Button>
      </div>

      {/* Status Summary */}
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(crmStatusLabels).map(([key, { label, color }]) => {
          const count = leads.filter(l => l.crm_status === key).length;
          if (!count) return null;
          return (
            <Badge key={key} variant="outline" className={`${color} text-[10px] cursor-pointer ${filterStatus === key ? "ring-1 ring-primary" : ""}`}
              onClick={() => setFilterStatus(filterStatus === key ? "all" : key)}>
              {label}: {count}
            </Badge>
          );
        })}
      </div>

      {/* Leads Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-center py-12 text-muted-foreground">Chargement…</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">Aucun lead trouvé</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entreprise</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead><MapPin className="h-3 w-3 inline" /> Ville</TableHead>
                    <TableHead><Target className="h-3 w-3 inline" /> Spécialité</TableHead>
                    <TableHead>Statut CRM</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead className="text-right">AIPP ↑</TableHead>
                    <TableHead>Hook</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 100).map(l => {
                    const st = crmStatusLabels[l.crm_status] || { label: l.crm_status, color: "" };
                    return (
                      <TableRow key={l.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/admin/outbound/leads/${l.id}`)}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div>
                              <p className="font-medium text-sm">{l.company?.company_name || "—"}</p>
                              {l.company?.google_rating && (
                                <p className="text-[10px] text-muted-foreground">★ {l.company.google_rating} · {l.company?.rbq_number ? "RBQ ✓" : "Pas RBQ"}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{l.contact?.full_name || "—"}</p>
                          <p className="text-[10px] text-muted-foreground">{l.contact?.email}</p>
                        </TableCell>
                        <TableCell className="text-sm">{l.company?.city}</TableCell>
                        <TableCell className="text-sm">{l.company?.specialty}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${st.color} text-[10px]`}>{st.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`font-bold text-sm ${
                            (l.total_priority_score || 0) >= 80 ? "text-emerald-400" :
                            (l.total_priority_score || 0) >= 60 ? "text-amber-400" : "text-red-400"
                          }`}>{l.total_priority_score}</span>
                        </TableCell>
                        <TableCell className="text-right text-sm">{l.aipp_upside_score}</TableCell>
                        <TableCell className="max-w-[200px]">
                          <p className="text-xs text-muted-foreground truncate">{l.hook_summary || "—"}</p>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
