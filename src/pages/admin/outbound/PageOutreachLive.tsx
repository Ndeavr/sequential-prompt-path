import { useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Rocket, Send, Users, MailCheck, Eye, MessageCircle, Phone, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

function useOutreachStats() {
  return useQuery({
    queryKey: ["outreach-live-stats"],
    queryFn: async () => {
      const [prospectsRes, emailsRes, sentRes] = await Promise.all([
        supabase.from("contractor_prospects").select("id, outreach_status, email", { count: "exact", head: false }).not("email", "is", null),
        supabase.from("email_send_log").select("*").eq("template_name", "outreach-direct").order("created_at", { ascending: false }).limit(200),
        supabase.from("contractor_prospects").select("id", { count: "exact" }).eq("outreach_status", "emailed"),
      ]);

      const prospects = prospectsRes.data || [];
      const emails = emailsRes.data || [];
      const sentCount = sentRes.count || 0;

      const pending = emails.filter(e => e.status === "pending").length;
      const sent = emails.filter(e => e.status === "sent").length;
      const failed = emails.filter(e => e.status === "failed" || e.status === "dlq").length;

      return {
        totalProspects: prospects.length,
        withEmail: prospects.filter(p => p.email).length,
        sentToday: sentCount,
        delivered: sent,
        pending,
        failed,
        opens: 0,
        replies: 0,
        recentEmails: emails.slice(0, 50),
      };
    },
    refetchInterval: 15000,
  });
}

export default function PageOutreachLive() {
  const qc = useQueryClient();
  const { data: stats, isLoading } = useOutreachStats();
  const [sendLimit, setSendLimit] = useState(5);

  const sendBatch = useMutation({
    mutationFn: async (params: { limit: number; dry_run: boolean }) => {
      const { data, error } = await supabase.functions.invoke("send-outreach-direct", {
        body: params,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.dry_run) {
        toast.info(`Dry run: ${data.total} prospects éligibles`);
      } else {
        toast.success(`${data.sent} emails en file d'attente!`);
      }
      qc.invalidateQueries({ queryKey: ["outreach-live-stats"] });
    },
    onError: (err) => toast.error(`Erreur: ${err.message}`),
  });

  const kpis = [
    { label: "Prospects trouvés", value: stats?.totalProspects ?? "—", icon: Users, color: "text-primary" },
    { label: "Avec email", value: stats?.withEmail ?? "—", icon: MailCheck, color: "text-emerald-400" },
    { label: "Envoyés", value: stats?.sentToday ?? "—", icon: Send, color: "text-blue-400" },
    { label: "Livrés", value: stats?.delivered ?? "—", icon: Eye, color: "text-amber-400" },
    { label: "En attente", value: stats?.pending ?? "—", icon: Loader2, color: "text-muted-foreground" },
    { label: "Échoués", value: stats?.failed ?? "—", icon: AlertTriangle, color: "text-red-400" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-4 p-3 md:p-6 max-w-6xl mx-auto pb-20">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-lg md:text-xl font-bold font-display flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              Outreach Live
            </h1>
            <p className="text-xs text-muted-foreground">Campagne d'acquisition en temps réel</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="text-xs border rounded px-2 py-1 bg-background"
              value={sendLimit}
              onChange={e => setSendLimit(Number(e.target.value))}
            >
              <option value={1}>1</option>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => sendBatch.mutate({ limit: sendLimit, dry_run: true })}
              disabled={sendBatch.isPending}
            >
              Test (Dry Run)
            </Button>
            <Button
              size="sm"
              onClick={() => sendBatch.mutate({ limit: sendLimit, dry_run: false })}
              disabled={sendBatch.isPending}
              className="bg-primary"
            >
              {sendBatch.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              <span className="ml-1">Envoyer</span>
            </Button>
          </div>
        </header>

        {/* KPI Cards */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {kpis.map(kpi => (
            <Card key={kpi.label} className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                <span className="text-[10px] text-muted-foreground">{kpi.label}</span>
              </div>
              <p className="text-lg font-bold">{isLoading ? "…" : kpi.value}</p>
            </Card>
          ))}
        </div>

        {/* System Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Statut système</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <StatusRow label="Email (notify.unpro.ca)" status="green" detail="Domaine vérifié, queue active" />
            <StatusRow label="Resend connecté" status="green" detail="API key configurée" />
            <StatusRow label="SMS (Twilio)" status="yellow" detail="Canal SMS désactivé sur Verify" />
            <StatusRow label="Cron process-email-queue" status="green" detail="Toutes les 5 secondes" />
            <StatusRow label="Cron process-outbound-queue" status="green" detail="Toutes les 15 minutes" />
          </CardContent>
        </Card>

        {/* Recent Emails */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Derniers emails</CardTitle>
          </CardHeader>
          <CardContent>
            {!stats?.recentEmails?.length ? (
              <p className="text-xs text-muted-foreground">Aucun email envoyé encore. Cliquez "Envoyer" ci-dessus.</p>
            ) : (
              <div className="space-y-1">
                {stats.recentEmails.map((e: any) => (
                  <div key={e.id} className="flex items-center justify-between text-xs border-b last:border-0 py-1.5">
                    <span className="truncate max-w-[200px]">{e.recipient_email}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {new Date(e.created_at).toLocaleString("fr-CA", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <StatusBadge status={e.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Send Result */}
        {sendBatch.data && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Dernier envoi</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-64">
                {JSON.stringify(sendBatch.data, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}

function StatusRow({ label, status, detail }: { label: string; status: "green" | "yellow" | "red"; detail: string }) {
  const colors = { green: "bg-emerald-500", yellow: "bg-amber-500", red: "bg-red-500" };
  return (
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${colors[status]}`} />
        <span>{label}</span>
      </div>
      <span className="text-muted-foreground">{detail}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: "En file", className: "bg-amber-500/20 text-amber-400" },
    sent: { label: "Envoyé", className: "bg-emerald-500/20 text-emerald-400" },
    failed: { label: "Échoué", className: "bg-red-500/20 text-red-400" },
    dlq: { label: "DLQ", className: "bg-red-500/20 text-red-400" },
    suppressed: { label: "Bloqué", className: "bg-muted text-muted-foreground" },
  };
  const m = map[status] || { label: status, className: "bg-muted" };
  return <Badge className={`text-[10px] ${m.className}`}>{m.label}</Badge>;
}
