/**
 * UNPRO — Admin Founder Invites Dashboard
 * View all invites, top ambassadors, success/failure rates.
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Users, Check, X, Clock, TrendingUp, QrCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface InviteSummary {
  id: string;
  referral_code: string;
  ambassador_user_id: string;
  status: string;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  created_at: string;
}

interface LogEntry {
  id: string;
  founder_invite_id: string;
  success: boolean;
  created_at: string;
}

export default function AdminFounderInvites() {
  const [invites, setInvites] = useState<InviteSummary[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "expired" | "logs">("active");

  useEffect(() => {
    const load = async () => {
      const [invRes, logRes] = await Promise.all([
        supabase.from("founder_invites" as any).select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("founder_invite_access_logs" as any).select("*").order("created_at", { ascending: false }).limit(200),
      ]);
      setInvites((invRes.data ?? []) as any[]);
      setLogs((logRes.data ?? []) as any[]);
      setLoading(false);
    };
    load();
  }, []);

  const activeInvites = invites.filter(i => i.status === "active");
  const expiredInvites = invites.filter(i => i.status !== "active");
  const successLogs = logs.filter(l => l.success);
  const failLogs = logs.filter(l => !l.success);

  // Top ambassadors
  const ambassadorCounts: Record<string, number> = {};
  invites.forEach(i => {
    ambassadorCounts[i.ambassador_user_id] = (ambassadorCounts[i.ambassador_user_id] || 0) + i.used_count;
  });
  const topAmbassadors = Object.entries(ambassadorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const filtered = tab === "active" ? activeInvites : tab === "expired" ? expiredInvites : [];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invitations Fondateur</h1>
          <p className="text-sm text-muted-foreground">Gestion des accès privés</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Actives", value: activeInvites.length, icon: Check, color: "text-green-500" },
          { label: "Expirées", value: expiredInvites.length, icon: Clock, color: "text-muted-foreground" },
          { label: "Accès réussis", value: successLogs.length, icon: TrendingUp, color: "text-primary" },
          { label: "Tentatives échouées", value: failLogs.length, icon: X, color: "text-red-400" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-border/30 bg-card/50 p-4">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Top ambassadors */}
      {topAmbassadors.length > 0 && (
        <div className="rounded-xl border border-border/30 bg-card/50 p-4">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Top ambassadeurs
          </h3>
          <div className="space-y-2">
            {topAmbassadors.map(([uid, count], i) => (
              <div key={uid} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-mono text-xs">{uid.slice(0, 8)}…</span>
                <Badge variant="outline">{count} accès générés</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {(["active", "expired", "logs"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
            }`}
          >
            {t === "active" ? "Actives" : t === "expired" ? "Expirées" : "Logs"}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-muted/20 animate-pulse" />)}</div>
      ) : tab === "logs" ? (
        <div className="space-y-2">
          {logs.slice(0, 50).map(l => (
            <div key={l.id} className="flex items-center justify-between rounded-lg border border-border/20 bg-card/30 p-3 text-sm">
              <span className="font-mono text-xs text-muted-foreground">{l.founder_invite_id.slice(0, 8)}…</span>
              <Badge variant={l.success ? "default" : "destructive"} className="text-xs">
                {l.success ? "Succès" : "Échec"}
              </Badge>
              <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("fr-CA")}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(inv => (
            <div key={inv.id} className="flex items-center justify-between rounded-lg border border-border/20 bg-card/30 p-3">
              <div className="flex items-center gap-3">
                <QrCode className="h-4 w-4 text-primary" />
                <span className="font-mono text-sm text-foreground">{inv.referral_code}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{inv.used_count}/{inv.max_uses}</span>
                <Badge variant={inv.status === "active" ? "default" : "secondary"} className="text-xs">
                  {inv.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
