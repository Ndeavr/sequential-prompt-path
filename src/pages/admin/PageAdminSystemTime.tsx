/**
 * UNPRO — System Time Health cockpit.
 * Shows UTC vs America/Toronto for edge runtime + DB + browser.
 * Manages `admin_sms_recipients` (admin-only SMS whitelist).
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { formatQcDateTime, UNPRO_TIMEZONE } from "@/lib/time/timezone";
import { Clock, CheckCircle2, AlertTriangle, Trash2, Plus, RefreshCw } from "lucide-react";

interface TzCheck {
  id: string;
  checked_at: string;
  edge_utc: string | null;
  db_utc: string | null;
  db_qc: string | null;
  drift_ms: number | null;
  status: string;
  notes: string | null;
}

interface AdminRecipient {
  phone: string;
  label: string | null;
  created_at: string;
}

export default function PageAdminSystemTime() {
  const [now, setNow] = useState<Date>(new Date());
  const [latest, setLatest] = useState<TzCheck | null>(null);
  const [history, setHistory] = useState<TzCheck[]>([]);
  const [recipients, setRecipients] = useState<AdminRecipient[]>([]);
  const [newPhone, setNewPhone] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  async function loadAll() {
    const [h, r] = await Promise.all([
      supabase
        .from("timezone_health_checks")
        .select("*")
        .order("checked_at", { ascending: false })
        .limit(24),
      supabase.from("admin_sms_recipients").select("*").order("created_at", { ascending: false }),
    ]);
    if (h.data) {
      const rows = h.data as TzCheck[];
      setHistory(rows);
      setLatest(rows[0] ?? null);
    }
    if (r.data) setRecipients(r.data as AdminRecipient[]);
  }

  useEffect(() => {
    loadAll();
    const t = setInterval(loadAll, 30000);
    return () => clearInterval(t);
  }, []);

  async function runHealthCheck() {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("timezone-health-check", { body: {} });
      if (error) throw error;
      toast.success(`Health check exécuté (${(data as any)?.status ?? "ok"}).`);
      await loadAll();
    } catch (e: any) {
      toast.error(`Erreur: ${e?.message ?? "inconnue"}`);
    } finally {
      setRunning(false);
    }
  }

  async function sendHeartbeat() {
    try {
      const { data, error } = await supabase.functions.invoke("sms-admin-test", { body: {} });
      if (error) throw error;
      const ok = (data as any)?.ok;
      if (ok) toast.success("Heartbeat envoyé.");
      else toast.error(`Bloqué: ${(data as any)?.error_message ?? "inconnu"}`);
    } catch (e: any) {
      toast.error(`Erreur: ${e?.message ?? "inconnue"}`);
    }
  }

  async function addRecipient() {
    const phone = newPhone.trim();
    if (!phone) return;
    const { error } = await supabase
      .from("admin_sms_recipients")
      .insert({ phone, label: newLabel.trim() || null });
    if (error) return toast.error(error.message);
    toast.success("Destinataire ajouté.");
    setNewPhone("");
    setNewLabel("");
    loadAll();
  }

  async function removeRecipient(phone: string) {
    const { error } = await supabase.from("admin_sms_recipients").delete().eq("phone", phone);
    if (error) return toast.error(error.message);
    toast.success("Retiré.");
    loadAll();
  }

  const utcStr = now.toISOString().replace("T", " ").slice(0, 19);
  const qcStr = formatQcDateTime(now);

  const statusOk = latest?.status === "ok";
  const badgeVariant = statusOk ? "default" : latest?.status === "drift" ? "secondary" : "destructive";
  const StatusIcon = statusOk ? CheckCircle2 : AlertTriangle;

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Clock className="w-6 h-6" /> System Time Health
          </h1>
          <p className="text-sm text-muted-foreground">
            Fuseau officiel UNPRO : <code>{UNPRO_TIMEZONE}</code>. Stockage en UTC, affichage
            converti au Québec.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={runHealthCheck} disabled={running}>
            <RefreshCw className={`w-4 h-4 mr-2 ${running ? "animate-spin" : ""}`} />
            Lancer health check
          </Button>
          <Button variant="outline" size="sm" onClick={sendHeartbeat}>
            Envoyer heartbeat SMS
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">UTC Server (navigateur)</div>
          <div className="text-2xl font-mono mt-2">{utcStr}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Toronto Time</div>
          <div className="text-2xl font-mono mt-2">{qcStr}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Dernier health check</div>
          <div className="flex items-center gap-2 mt-2">
            <StatusIcon className={`w-5 h-5 ${statusOk ? "text-green-500" : "text-red-500"}`} />
            <Badge variant={badgeVariant as any}>{latest?.status ?? "aucun"}</Badge>
          </div>
          {latest?.notes && (
            <div className="text-xs text-muted-foreground mt-2">{latest.notes}</div>
          )}
          {latest?.checked_at && (
            <div className="text-xs text-muted-foreground mt-1">
              {formatQcDateTime(latest.checked_at)}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">Historique 24 dernières exécutions</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b">
                <th className="py-2">Heure QC</th>
                <th>Status</th>
                <th>Edge UTC</th>
                <th>DB QC</th>
                <th>Drift (ms)</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-muted-foreground">
                    Aucun health check exécuté.
                  </td>
                </tr>
              )}
              {history.map((r) => (
                <tr key={r.id} className="border-b border-border/10">
                  <td className="py-2 font-mono text-xs">{formatQcDateTime(r.checked_at)}</td>
                  <td>
                    <Badge variant={r.status === "ok" ? "default" : "destructive"}>
                      {r.status}
                    </Badge>
                  </td>
                  <td className="font-mono text-xs">{r.edge_utc?.slice(0, 19) ?? "—"}</td>
                  <td className="font-mono text-xs">{r.db_qc ?? "—"}</td>
                  <td className="font-mono text-xs">{r.drift_ms ?? 0}</td>
                  <td className="text-xs text-muted-foreground">{r.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-1">Admin SMS whitelist</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Seuls ces numéros peuvent recevoir des SMS de monitoring (test système, heartbeat,
          debug, cron test). Aucun prospect ne reçoit ces messages.
        </p>
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="+15145550123"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            className="max-w-[220px]"
          />
          <Input
            placeholder="Étiquette (ex. Charles)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="max-w-[240px]"
          />
          <Button onClick={addRecipient} size="sm">
            <Plus className="w-4 h-4 mr-1" /> Ajouter
          </Button>
        </div>
        <div className="space-y-2">
          {recipients.length === 0 && (
            <div className="text-sm text-muted-foreground">Aucun destinataire — les SMS de monitoring restent bloqués (sauf le numéro configuré via secret).</div>
          )}
          {recipients.map((r) => (
            <div key={r.phone} className="flex items-center justify-between border rounded px-3 py-2">
              <div>
                <div className="font-mono text-sm">{r.phone}</div>
                {r.label && <div className="text-xs text-muted-foreground">{r.label}</div>}
              </div>
              <Button variant="ghost" size="sm" onClick={() => removeRecipient(r.phone)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
