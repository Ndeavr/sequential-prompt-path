import AdminLayout from "@/layouts/AdminLayout";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Play, Pause, Search, Filter, Target, MapPin, Timer } from "lucide-react";
import { toast } from "sonner";
import PanelCampaignScheduling from "@/components/outbound/PanelCampaignScheduling";
import PanelSendLogs from "@/components/outbound/PanelSendLogs";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  ready: "bg-blue-500/20 text-blue-400",
  active: "bg-emerald-500/20 text-emerald-400",
  paused: "bg-amber-500/20 text-amber-400",
  completed: "bg-primary/20 text-primary",
  archived: "bg-muted text-muted-foreground",
};

export default function PageOutboundCampaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [sequences, setSequences] = useState<any[]>([]);
  const [mailboxes, setMailboxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [c, l, s, m] = await Promise.all([
      supabase.from("outbound_campaigns").select("*").order("priority_index"),
      supabase.from("outbound_leads").select("campaign_id, crm_status"),
      supabase.from("outbound_sequences").select("id, sequence_name"),
      supabase.from("outbound_mailboxes").select("id, sender_name, sender_email"),
    ]);
    setCampaigns(c.data || []);
    setLeads(l.data || []);
    setSequences(s.data || []);
    setMailboxes(m.data || []);
    setLoading(false);
  }

  async function toggleStatus(id: string, current: string) {
    const next = current === "active" ? "paused" : current === "paused" ? "active" : current === "ready" ? "active" : current;
    if (next === current) return;
    const { error } = await supabase.from("outbound_campaigns").update({ campaign_status: next }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Campagne ${next === "active" ? "activée" : "pausée"}`);
    load();
  }

  const filtered = campaigns.filter(c => {
    if (filterStatus !== "all" && c.campaign_status !== filterStatus) return false;
    if (search && !c.campaign_name.toLowerCase().includes(search.toLowerCase()) && !c.city?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate("/admin/outbound")}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Retour
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Campagnes Outbound</h1>
          <p className="text-sm text-muted-foreground">Organisées par ville × spécialité</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Chercher…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        {["all", "active", "ready", "paused", "draft", "completed"].map(s => (
          <Button key={s} variant={filterStatus === s ? "default" : "outline"} size="sm" onClick={() => setFilterStatus(s)}>
            {s === "all" ? "Tous" : s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-center py-12 text-muted-foreground">Chargement…</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">Aucune campagne trouvée</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Campagne</TableHead>
                    <TableHead><MapPin className="h-3 w-3 inline mr-1" />Ville</TableHead>
                    <TableHead><Target className="h-3 w-3 inline mr-1" />Spécialité</TableHead>
                    <TableHead>Séquence</TableHead>
                    <TableHead>Mailbox</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">En séq.</TableHead>
                    <TableHead className="text-right">Réponses</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c, i) => {
                    const cLeads = leads.filter(l => l.campaign_id === c.id);
                    const inSeq = cLeads.filter(l => l.crm_status === "in_sequence").length;
                    const replied = cLeads.filter(l => ["replied_positive", "replied_neutral", "replied_negative"].includes(l.crm_status)).length;
                    const seq = sequences.find(s => s.id === c.sequence_id);
                    const mb = mailboxes.find(m => m.id === c.mailbox_id);
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="text-muted-foreground">{c.priority_index || i + 1}</TableCell>
                        <TableCell className="font-medium">{c.campaign_name}</TableCell>
                        <TableCell>{c.city}</TableCell>
                        <TableCell>{c.specialty}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{seq?.sequence_name || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{mb?.sender_email || "—"}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[c.campaign_status] || ""} variant="outline">
                            {c.campaign_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{cLeads.length}</TableCell>
                        <TableCell className="text-right">{inSeq}</TableCell>
                        <TableCell className="text-right">{replied}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {(c.campaign_status === "active" || c.campaign_status === "paused" || c.campaign_status === "ready") && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleStatus(c.id, c.campaign_status)}>
                                {c.campaign_status === "active" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedCampaign(selectedCampaign?.id === c.id ? null : c)}>
                              <Timer className="h-3.5 w-3.5" />
                            </Button>
                          </div>
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

      {/* Scheduling Panel */}
      {selectedCampaign && (
        <div className="grid md:grid-cols-2 gap-4">
          <PanelCampaignScheduling campaign={selectedCampaign} onUpdate={load} />
          <PanelSendLogs campaignId={selectedCampaign.id} />
        </div>
      )}

      {/* City × Specialty Grid */}
      <Card>
        <CardHeader><CardTitle className="text-base">Couverture Ville × Spécialité</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {campaigns.map(c => {
              const count = leads.filter(l => l.campaign_id === c.id).length;
              return (
                <div key={c.id} className="border border-border rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{c.city}</span>
                    <Badge className={`${statusColors[c.campaign_status] || ""} text-[10px]`} variant="outline">
                      {c.campaign_status}
                    </Badge>
                  </div>
                  <p className="text-sm font-semibold">{c.specialty}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{count} leads · {c.daily_send_limit}/jour</p>
                    {c.auto_send_enabled && (
                      <Badge variant="outline" className="text-[9px] bg-emerald-500/20 text-emerald-400">
                        Auto
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Global Send Logs */}
      <PanelSendLogs />
    </div>
  );
}
