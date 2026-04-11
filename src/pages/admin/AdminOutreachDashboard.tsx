/**
 * UNPRO — Outreach Engine Dashboard (Enhanced)
 * Campaigns, contacts, sequences, A/B testing, analytics & blacklist.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader, StatCard, LoadingState, EmptyState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Mail, Send, Eye, MousePointerClick, UserCheck, AlertTriangle, Plus,
  Play, Pause, BarChart3, Users, Ban, Zap, Clock, ArrowRight,
  MessageSquare, Shield, Search, RefreshCw, TrendingUp, Target,
} from "lucide-react";

/* ─── Hooks ─── */
const useCampaigns = () =>
  useQuery({
    queryKey: ["outreach-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outreach_campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

const useMessages = () =>
  useQuery({
    queryKey: ["outreach-messages-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outreach_messages")
        .select("message_status, campaign_id")
        .limit(1000);
      if (error) throw error;
      return data ?? [];
    },
  });

const useRecipients = () =>
  useQuery({
    queryKey: ["outreach-recipients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outreach_recipients")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

const useSequences = () =>
  useQuery({
    queryKey: ["outreach-sequences"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outreach_sequences")
        .select("*, outreach_sequence_steps(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

const useSuppressions = () =>
  useQuery({
    queryKey: ["outreach-suppressions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outreach_suppressions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

const useEvents = () =>
  useQuery({
    queryKey: ["outreach-events-recent"],
    queryFn: async () => {
      const [opens, clicks, unsubs] = await Promise.all([
        supabase.from("outreach_open_events").select("id").limit(1000),
        supabase.from("outreach_click_events").select("id").limit(1000),
        supabase.from("outreach_unsubscribes").select("id").limit(1000),
      ]);
      return {
        opens: opens.data?.length ?? 0,
        clicks: clicks.data?.length ?? 0,
        unsubs: unsubs.data?.length ?? 0,
      };
    },
  });

/* ─── Status helpers ─── */
const statusConfig: Record<string, { cls: string; label: string }> = {
  draft: { cls: "bg-muted text-muted-foreground", label: "Brouillon" },
  ready: { cls: "bg-blue-500/20 text-blue-300", label: "Prêt" },
  running: { cls: "bg-emerald-500/20 text-emerald-300", label: "Active" },
  paused: { cls: "bg-amber-500/20 text-amber-300", label: "Pausée" },
  completed: { cls: "bg-primary/20 text-primary", label: "Terminée" },
  failed: { cls: "bg-destructive/20 text-destructive", label: "Échouée" },
};

const recipientStatus: Record<string, { cls: string; label: string }> = {
  pending: { cls: "bg-muted text-muted-foreground", label: "En attente" },
  active: { cls: "bg-blue-500/20 text-blue-300", label: "Actif" },
  contacted: { cls: "bg-amber-500/20 text-amber-300", label: "Contacté" },
  converted: { cls: "bg-emerald-500/20 text-emerald-300", label: "Converti" },
  opted_out: { cls: "bg-red-500/20 text-red-300", label: "Opt-out" },
  bounced: { cls: "bg-destructive/20 text-destructive", label: "Bounce" },
};

/* ─── Campaigns Tab ─── */
const CampaignsTab = ({ campaigns, navigate }: { campaigns: any[]; navigate: any }) => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <h3 className="text-sm font-semibold text-muted-foreground">Campagnes actives</h3>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => navigate("/admin/outreach/templates")}>
          <Mail className="h-4 w-4 mr-1" /> Templates
        </Button>
        <Button size="sm" onClick={() => navigate("/admin/outreach/new")}>
          <Plus className="h-4 w-4 mr-1" /> Nouvelle campagne
        </Button>
      </div>
    </div>
    {campaigns.length === 0 ? (
      <EmptyState message="Aucune campagne d'outreach" />
    ) : (
      <Card className="border-border/30 bg-card/60">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/20">
                <TableHead>Campagne</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-center">Limites</TableHead>
                <TableHead className="text-center">Stop conv.</TableHead>
                <TableHead>Date</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c) => {
                const st = statusConfig[c.status] || statusConfig.draft;
                return (
                  <TableRow key={c.id} className="border-border/10 cursor-pointer" onClick={() => navigate(`/admin/outreach/${c.id}`)}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs gap-1">
                        {c.primary_channel === "email" ? <Mail className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                        {c.primary_channel}
                      </Badge>
                    </TableCell>
                    <TableCell><Badge className={`text-xs ${st.cls}`}>{st.label}</Badge></TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">{c.hourly_send_limit}/h · {c.daily_send_limit}/j</TableCell>
                    <TableCell className="text-center">
                      {c.stop_on_conversion ? <Shield className="h-4 w-4 text-emerald-400 mx-auto" /> : <span className="text-muted-foreground text-xs">Non</span>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("fr-CA")}</TableCell>
                    <TableCell><Button variant="ghost" size="sm">Détails <ArrowRight className="h-3 w-3 ml-1" /></Button></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    )}
  </div>
);

/* ─── Contacts Tab ─── */
const ContactsTab = ({ recipients }: { recipients: any[] }) => {
  const [search, setSearch] = useState("");
  const filtered = recipients.filter(
    (r) => !search || [r.prospect_name, r.prospect_email, r.prospect_company, r.prospect_city].some(
      (v) => v?.toLowerCase().includes(search.toLowerCase())
    )
  );
  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher un contact..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Badge variant="outline">{filtered.length} contacts</Badge>
      </div>
      <Card className="border-border/30 bg-card/60">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/20">
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Entreprise</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 50).map((r) => {
                const st = recipientStatus[r.recipient_status] || recipientStatus.pending;
                return (
                  <TableRow key={r.id} className="border-border/10">
                    <TableCell className="font-medium">{r.prospect_name || "—"}</TableCell>
                    <TableCell className="text-sm">{r.prospect_email || "—"}</TableCell>
                    <TableCell className="text-sm">{r.prospect_company || "—"}</TableCell>
                    <TableCell className="text-sm">{r.prospect_city || "—"}</TableCell>
                    <TableCell><Badge className={`text-xs ${st.cls}`}>{st.label}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.source || "—"}</TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun contact trouvé</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

/* ─── Sequences Tab ─── */
const SequencesTab = ({ sequences }: { sequences: any[] }) => (
  <div className="space-y-4">
    <h3 className="text-sm font-semibold text-muted-foreground">Séquences multi-étapes</h3>
    {sequences.length === 0 ? (
      <EmptyState message="Aucune séquence créée" />
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sequences.map((seq) => {
          const steps = seq.outreach_sequence_steps || [];
          return (
            <Card key={seq.id} className="border-border/30 bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>{seq.sequence_name || "Séquence sans nom"}</span>
                  <Badge variant="outline" className="text-xs">{steps.length} étapes</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Timeline */}
                <div className="relative pl-6 space-y-3">
                  <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-border/40" />
                  {steps.sort((a: any, b: any) => a.step_order - b.step_order).map((step: any, i: number) => (
                    <div key={step.id} className="relative flex items-start gap-3">
                      <div className={`absolute -left-4 w-3 h-3 rounded-full border-2 ${i === 0 ? "bg-primary border-primary" : "bg-background border-border"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold">Étape {step.step_order}</span>
                          <Badge variant="outline" className="text-[10px]">{step.channel_type}</Badge>
                          {step.delay_value > 0 && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" /> +{step.delay_value}{step.delay_unit === "hours" ? "h" : "j"}
                            </span>
                          )}
                        </div>
                        {step.send_condition && step.send_condition !== "none" && (
                          <span className="text-[10px] text-amber-400">Condition: {step.send_condition}</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {steps.length === 0 && <p className="text-xs text-muted-foreground">Aucune étape définie</p>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    )}
  </div>
);

/* ─── Blacklist Tab ─── */
const BlacklistTab = ({ suppressions }: { suppressions: any[] }) => (
  <div className="space-y-4">
    <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
      <Ban className="h-4 w-4 text-red-400" /> Liste de suppression
      <Badge variant="outline">{suppressions.length}</Badge>
    </h3>
    <Card className="border-border/30 bg-card/60">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border/20">
              <TableHead>Email</TableHead>
              <TableHead>Raison</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppressions.map((s) => (
              <TableRow key={s.id} className="border-border/10">
                <TableCell className="font-mono text-sm">{s.email}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs ${s.reason === "bounce" ? "text-red-400" : s.reason === "complaint" ? "text-orange-400" : "text-muted-foreground"}`}>
                    {s.reason}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{s.source || "système"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString("fr-CA")}</TableCell>
              </TableRow>
            ))}
            {suppressions.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Aucune suppression</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </div>
);

/* ─── Main Page ─── */
export default function AdminOutreachDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("campaigns");

  const { data: campaigns = [], isLoading: loadCamp } = useCampaigns();
  const { data: messages = [] } = useMessages();
  const { data: recipients = [] } = useRecipients();
  const { data: sequences = [] } = useSequences();
  const { data: suppressions = [] } = useSuppressions();
  const { data: events } = useEvents();

  const sent = messages.filter((m) => ["sent", "delivered", "opened", "clicked"].includes(m.message_status)).length;
  const delivered = messages.filter((m) => ["delivered", "opened", "clicked"].includes(m.message_status)).length;
  const bounced = messages.filter((m) => m.message_status === "bounced").length;
  const converted = messages.filter((m) => m.message_status === "converted").length;

  if (loadCamp) return <AdminLayout><LoadingState /></AdminLayout>;

  return (
    <AdminLayout>
      <PageHeader
        title="Moteur d'Outreach"
        description="Email & SMS — Campagnes, séquences, tracking et conversion"
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        <StatCard title="Envoyés" value={sent} icon={<Send className="h-5 w-5 text-blue-400" />} />
        <StatCard title="Livrés" value={delivered} icon={<Mail className="h-5 w-5 text-emerald-400" />} />
        <StatCard title="Ouvertures" value={events?.opens ?? 0} icon={<Eye className="h-5 w-5 text-purple-400" />} />
        <StatCard title="Clics" value={events?.clicks ?? 0} icon={<MousePointerClick className="h-5 w-5 text-orange-400" />} />
        <StatCard title="Conversions" value={converted} icon={<UserCheck className="h-5 w-5 text-emerald-400" />} />
        <StatCard title="Bounces" value={bounced} icon={<AlertTriangle className="h-5 w-5 text-red-400" />} />
        <StatCard title="Désabonnés" value={events?.unsubs ?? 0} icon={<Ban className="h-5 w-5 text-muted-foreground" />} />
      </div>

      {/* Conversion funnel mini */}
      <Card className="border-border/30 bg-card/60 mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-2 overflow-x-auto">
            {[
              { label: "Contacts", val: recipients.length, icon: Users },
              { label: "Envoyés", val: sent, icon: Send },
              { label: "Ouvertures", val: events?.opens ?? 0, icon: Eye },
              { label: "Clics", val: events?.clicks ?? 0, icon: MousePointerClick },
              { label: "Conversions", val: converted, icon: UserCheck },
            ].map((step, i, arr) => (
              <div key={step.label} className="flex items-center gap-2">
                <div className="text-center min-w-[80px]">
                  <step.icon className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-lg font-bold">{step.val}</div>
                  <div className="text-[10px] text-muted-foreground">{step.label}</div>
                </div>
                {i < arr.length - 1 && (
                  <div className="flex flex-col items-center">
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40" />
                    {step.val > 0 && arr[i + 1].val > 0 && (
                      <span className="text-[9px] text-muted-foreground">{Math.round((arr[i + 1].val / step.val) * 100)}%</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted/30 mb-4">
          <TabsTrigger value="campaigns">📧 Campagnes</TabsTrigger>
          <TabsTrigger value="contacts">👥 Contacts</TabsTrigger>
          <TabsTrigger value="sequences">⏱️ Séquences</TabsTrigger>
          <TabsTrigger value="blacklist">🚫 Suppressions</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          <CampaignsTab campaigns={campaigns} navigate={navigate} />
        </TabsContent>
        <TabsContent value="contacts">
          <ContactsTab recipients={recipients} />
        </TabsContent>
        <TabsContent value="sequences">
          <SequencesTab sequences={sequences} />
        </TabsContent>
        <TabsContent value="blacklist">
          <BlacklistTab suppressions={suppressions} />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
