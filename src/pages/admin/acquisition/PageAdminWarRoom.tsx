import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Mail, MessageSquare, DollarSign, Users, Zap, AlertCircle, MapPin } from "lucide-react";

interface Stats {
  contractorsToday: number;
  pagesCreated: number;
  emailsSent: number;
  emailsOpened: number;
  smsSent: number;
  activations: number;
  upgradesPending: number;
  totalRevenue: number;
}

export default function PageAdminWarRoom() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [recentActivations, setRecentActivations] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const [
        { count: contractorsToday },
        { count: pagesCreated },
        { count: emailsSent },
        { count: emailsOpened },
        { count: smsSent },
        { count: activations },
        { count: upgradesPending },
        { data: revenueRows },
        { data: slotData },
        { data: recentActs },
      ] = await Promise.all([
        supabase.from("acq_contractors").select("*", { count: "exact", head: true }).gte("created_at", since),
        supabase.from("acq_aipp_pages").select("*", { count: "exact", head: true }).gte("created_at", since),
        supabase.from("acq_email_logs").select("*", { count: "exact", head: true }).gte("created_at", since).eq("status", "sent"),
        supabase.from("acq_email_logs").select("*", { count: "exact", head: true }).gte("created_at", since).not("opened_at", "is", null),
        supabase.from("acq_sms_logs").select("*", { count: "exact", head: true }).gte("created_at", since).eq("status", "sent"),
        supabase.from("acq_subscriptions").select("*", { count: "exact", head: true }).gte("activated_at", since),
        supabase.from("acq_subscriptions").select("*", { count: "exact", head: true }).eq("status", "trial_active"),
        supabase.from("acq_subscriptions").select("amount_paid").gte("activated_at", since),
        supabase.from("acq_territory_slots").select("*").order("city"),
        supabase.from("acq_subscriptions")
          .select("id,activated_at,amount_paid,plan_code,status,contractor_id,acq_contractors(company_name,city)")
          .order("activated_at", { ascending: false }).limit(10),
      ]);

      const totalRevenue = (revenueRows || []).reduce((s: number, r: any) => s + Number(r.amount_paid || 0), 0);
      setStats({
        contractorsToday: contractorsToday || 0,
        pagesCreated: pagesCreated || 0,
        emailsSent: emailsSent || 0,
        emailsOpened: emailsOpened || 0,
        smsSent: smsSent || 0,
        activations: activations || 0,
        upgradesPending: upgradesPending || 0,
        totalRevenue,
      });
      setSlots(slotData || []);
      setRecentActivations(recentActs || []);
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const openRate = stats && stats.emailsSent > 0
    ? Math.round((stats.emailsOpened / stats.emailsSent) * 100) : 0;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Zap className="text-primary" /> War Room
            </h1>
            <p className="text-sm text-muted-foreground">Tableau de bord d'acquisition en temps réel</p>
          </div>
          <Badge variant="outline" className="gap-1"><Activity className="w-3 h-3" /> Live</Badge>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat icon={<Users className="text-blue-500" />} label="Entrepreneurs ajoutés (24h)" value={stats?.contractorsToday ?? "—"} />
          <Stat icon={<Activity className="text-purple-500" />} label="Pages AIPP créées" value={stats?.pagesCreated ?? "—"} />
          <Stat icon={<Mail className="text-emerald-500" />} label="Emails envoyés" value={stats?.emailsSent ?? "—"} sub={`Taux d'ouverture: ${openRate}%`} />
          <Stat icon={<MessageSquare className="text-orange-500" />} label="SMS envoyés" value={stats?.smsSent ?? "—"} />
          <Stat icon={<DollarSign className="text-green-500" />} label="Activations 1$" value={stats?.activations ?? "—"} />
          <Stat icon={<TrendingArrow />} label="Upgrades en attente" value={stats?.upgradesPending ?? "—"} highlight={Boolean(stats?.upgradesPending)} />
          <Stat icon={<DollarSign className="text-green-600" />} label="Revenus aujourd'hui" value={`$${(stats?.totalRevenue ?? 0).toFixed(2)}`} />
          <Stat icon={<AlertCircle className="text-red-500" />} label="Slots restants total"
            value={slots.reduce((s, x) => s + Math.max(0, x.max_slots - x.used_slots), 0)} />
        </div>

        {/* Slots */}
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2"><MapPin className="w-4 h-4" /> Territoires</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {slots.map(s => {
                const remaining = s.max_slots - s.used_slots;
                const ratio = s.used_slots / Math.max(1, s.max_slots);
                return (
                  <div key={s.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{s.city} · <span className="text-muted-foreground">{s.trade}</span></div>
                      <Badge variant={remaining === 0 ? "destructive" : remaining === 1 ? "default" : "outline"}>
                        {remaining === 0 ? "Complet" : `${remaining} restantes`}
                      </Badge>
                    </div>
                    <div className="h-2 bg-muted rounded overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${ratio * 100}%` }} />
                    </div>
                    <div className="text-xs text-muted-foreground">{s.used_slots} / {s.max_slots}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent activations */}
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4">Activations récentes</h2>
            <div className="space-y-2">
              {recentActivations.length === 0 && <p className="text-sm text-muted-foreground">Aucune activation pour le moment.</p>}
              {recentActivations.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between border-b py-2 text-sm">
                  <div>
                    <div className="font-medium">{r.acq_contractors?.company_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{r.acq_contractors?.city} · {r.plan_code}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">${Number(r.amount_paid || 0).toFixed(2)}</div>
                    <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, sub, highlight }: { icon: React.ReactNode; label: string; value: any; sub?: string; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-primary/40" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon} {label}</div>
        <div className="text-2xl font-bold mt-1">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function TrendingArrow() {
  return <Activity className="text-amber-500 w-4 h-4" />;
}
