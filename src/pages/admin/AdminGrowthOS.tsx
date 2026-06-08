/**
 * UNPRO — Growth Operating System cockpit (Phase 1)
 * /admin/growth-os
 */
import { useEffect, useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader, StatCard, LoadingState, EmptyState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Users, Megaphone, CheckCircle2, Clock, PlayCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type Competitor = {
  id: string; contractor_id: string; competitor_name: string; trade: string | null;
  city: string | null; website: string | null; phone: string | null; email: string | null;
  google_rating: number | null; review_count: number | null; aipp_score: number | null;
  status: string; created_at: string;
};
type Campaign = {
  id: string; contractor_id: string; trade: string | null; city: string | null;
  status: string; targets_found: number; sms_sent: number; emails_sent: number;
  replies: number; appointments: number; activations: number; created_at: string;
};

const STATUS_COLOR: Record<string, string> = {
  queued: "bg-muted text-foreground",
  running: "bg-blue-500/15 text-blue-600",
  waiting_review: "bg-amber-500/15 text-amber-700",
  approved: "bg-emerald-500/15 text-emerald-700",
  sent: "bg-cyan-500/15 text-cyan-700",
  replied: "bg-violet-500/15 text-violet-700",
  booked: "bg-fuchsia-500/15 text-fuchsia-700",
  activated: "bg-emerald-600/20 text-emerald-700",
  failed: "bg-destructive/15 text-destructive",
};

const AdminGrowthOS = () => {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [tasks, setTasks] = useState<{ id: string; type: string; status: string; created_at: string }[]>([]);
  const [activeContractors, setActiveContractors] = useState(0);
  const [eag, setEag] = useState<{ contractor_id: string; business_name: string | null; exclusive_appointments: number }[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data: camp }, { data: comp }, { data: tk }, { count: ac }, { data: eagRows }] = await Promise.all([
      supabase.from("contractor_growth_campaigns").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("contractor_competitors").select("*").eq("status", "waiting_review").order("created_at", { ascending: false }).limit(50),
      supabase.from("growth_tasks").select("id,type,status,created_at").order("created_at", { ascending: false }).limit(20),
      supabase.from("contractors").select("id", { count: "exact", head: true }).eq("account_status", "active"),
      supabase.from("v_contractor_eag_monthly").select("contractor_id,business_name,exclusive_appointments")
        .order("exclusive_appointments", { ascending: false }).limit(10),
    ]);
    setCampaigns((camp ?? []) as Campaign[]);
    setCompetitors((comp ?? []) as Competitor[]);
    setTasks((tk ?? []) as typeof tasks);
    setActiveContractors(ac ?? 0);
    setEag((eagRows ?? []) as typeof eag);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function approve(id: string) {
    const { error } = await supabase.from("contractor_competitors").update({ status: "approved" }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Concurrent approuvé"); load(); }
  }
  async function reject(id: string) {
    const { error } = await supabase.from("contractor_competitors").update({ status: "failed" }).eq("id", id);
    if (error) toast.error(error.message); else load();
  }
  async function runDispatcher() {
    setBusy(true);
    const { error } = await supabase.functions.invoke("growth-task-dispatcher");
    setBusy(false);
    if (error) toast.error(error.message); else { toast.success("Dispatcher exécuté"); load(); }
  }
  async function runOutreach() {
    setBusy(true);
    const { error } = await supabase.functions.invoke("growth-outreach-agent");
    setBusy(false);
    if (error) toast.error(error.message); else { toast.success("Outreach exécuté"); load(); }
  }

  if (loading) return <AdminLayout><LoadingState /></AdminLayout>;

  const runningJobs = tasks.filter((t) => t.status === "running" || t.status === "queued").length;
  const totalAppointments = campaigns.reduce((a, c) => a + (c.appointments ?? 0), 0);
  const totalActivations = campaigns.reduce((a, c) => a + (c.activations ?? 0), 0);
  const conversionRate = campaigns.length
    ? Math.round((totalActivations / Math.max(1, campaigns.reduce((a, c) => a + (c.sms_sent ?? 0) + (c.emails_sent ?? 0), 0))) * 1000) / 10
    : 0;

  return (
    <AdminLayout>
      <div className="admin-theme">
        <PageHeader
          title="Growth Operating System"
          description="Moteur de croissance autonome — Phase 1. EAG = rendez-vous exclusifs / entrepreneur actif / mois."
          action={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Rafraîchir</Button>
              <Button variant="outline" size="sm" disabled={busy} onClick={runDispatcher}><PlayCircle className="h-4 w-4 mr-1" />Dispatcher</Button>
              <Button size="sm" disabled={busy} onClick={runOutreach}><Megaphone className="h-4 w-4 mr-1" />Lancer outreach</Button>
            </div>
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard title="Entrepreneurs actifs" value={activeContractors} icon={<Users className="h-4 w-4" />} />
          <StatCard title="Jobs en cours" value={runningJobs} icon={<Clock className="h-4 w-4" />} />
          <StatCard title="Rendez-vous générés" value={totalAppointments} icon={<CheckCircle2 className="h-4 w-4" />} />
          <StatCard title="Taux de conversion" value={`${conversionRate}%`} icon={<TrendingUp className="h-4 w-4" />}
            description={`${totalActivations} activations`} />
        </div>

        <Card className="mb-6">
          <CardHeader><CardTitle>EAG — Top entrepreneurs (mois courant)</CardTitle></CardHeader>
          <CardContent>
            {eag.length === 0 ? <EmptyState message="Aucun rendez-vous exclusif ce mois-ci." />
              : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Entrepreneur</TableHead>
                    <TableHead className="text-right">Rendez-vous exclusifs</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {eag.map((r) => (
                      <TableRow key={r.contractor_id}>
                        <TableCell>{r.business_name ?? r.contractor_id.slice(0, 8)}</TableCell>
                        <TableCell className="text-right font-semibold">{r.exclusive_appointments}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader><CardTitle>File d'approbation — concurrents découverts</CardTitle></CardHeader>
          <CardContent>
            {competitors.length === 0 ? <EmptyState message="Aucun concurrent en attente de revue." />
              : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Nom</TableHead><TableHead>Métier</TableHead><TableHead>Ville</TableHead>
                    <TableHead>Note</TableHead><TableHead>Avis</TableHead><TableHead>Contact</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {competitors.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.competitor_name}</TableCell>
                        <TableCell>{c.trade ?? "—"}</TableCell>
                        <TableCell>{c.city ?? "—"}</TableCell>
                        <TableCell>{c.google_rating ?? "—"}</TableCell>
                        <TableCell>{c.review_count ?? 0}</TableCell>
                        <TableCell>{c.phone ?? c.email ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => reject(c.id)}>Rejeter</Button>
                          <Button size="sm" className="ml-2" onClick={() => approve(c.id)}>Approuver</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader><CardTitle>Campagnes récentes</CardTitle></CardHeader>
          <CardContent>
            {campaigns.length === 0 ? <EmptyState message="Aucune campagne. Active un entrepreneur pour démarrer." />
              : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Métier</TableHead><TableHead>Ville</TableHead><TableHead>Statut</TableHead>
                    <TableHead className="text-right">Cibles</TableHead><TableHead className="text-right">SMS</TableHead>
                    <TableHead className="text-right">Emails</TableHead><TableHead className="text-right">RDV</TableHead>
                    <TableHead className="text-right">Activations</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {campaigns.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.trade ?? "—"}</TableCell>
                        <TableCell>{c.city ?? "—"}</TableCell>
                        <TableCell><Badge className={STATUS_COLOR[c.status] ?? ""}>{c.status}</Badge></TableCell>
                        <TableCell className="text-right">{c.targets_found}</TableCell>
                        <TableCell className="text-right">{c.sms_sent}</TableCell>
                        <TableCell className="text-right">{c.emails_sent}</TableCell>
                        <TableCell className="text-right">{c.appointments}</TableCell>
                        <TableCell className="text-right">{c.activations}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>File de tâches (growth_tasks)</CardTitle></CardHeader>
          <CardContent>
            {tasks.length === 0 ? <EmptyState message="Aucune tâche." />
              : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Type</TableHead><TableHead>Statut</TableHead><TableHead>Créée</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {tasks.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{t.type}</TableCell>
                        <TableCell><Badge className={STATUS_COLOR[t.status] ?? ""}>{t.status}</Badge></TableCell>
                        <TableCell>{new Date(t.created_at).toLocaleString("fr-CA")}</TableCell>
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
};

export default AdminGrowthOS;
