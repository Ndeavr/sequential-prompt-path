import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

type LogRow = {
  id: string;
  message_subject: string | null;
  to_address: string;
  template_key: string;
  sent_at: string;
  status: string;
  cta_urls: string[] | null;
  has_tracked_cta: boolean;
  clicked_at: string | null;
  rendered_text: string | null;
};

type Finding = {
  id: string;
  template_key: string | null;
  total_emails: number;
  count_no_url: number;
  count_direct_url: number;
  count_tracked_url: number;
  root_cause: string | null;
  ran_at: string;
};

export default function PageAdminEmailCtaAudit() {
  const [stats, setStats] = useState({ sent: 0, tracked: 0, direct: 0, missing: 0, clicked: 0 });
  const [rows, setRows] = useState<LogRow[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [preview, setPreview] = useState<LogRow | null>(null);

  async function load() {
    setLoading(true);
    const since = new Date(Date.now() - 30 * 86400 * 1000).toISOString();
    const { data } = await supabase
      .from("contractor_outreach_logs")
      .select("id,message_subject,to_address,template_key,sent_at,status,cta_urls,has_tracked_cta,clicked_at,rendered_text")
      .eq("channel", "email")
      .gte("sent_at", since)
      .order("sent_at", { ascending: false })
      .limit(100);
    const all = (data ?? []) as LogRow[];
    setRows(all);
    const s = { sent: all.length, tracked: 0, direct: 0, missing: 0, clicked: 0 };
    for (const r of all) {
      const urls = r.cta_urls ?? [];
      if (urls.length === 0) s.missing++;
      else if (r.has_tracked_cta) s.tracked++;
      else s.direct++;
      if (r.clicked_at) s.clicked++;
    }
    setStats(s);
    const { data: f } = await supabase
      .from("email_cta_audit_findings")
      .select("id,template_key,total_emails,count_no_url,count_direct_url,count_tracked_url,root_cause,ran_at")
      .order("ran_at", { ascending: false })
      .limit(20);
    setFindings((f ?? []) as Finding[]);
    setLoading(false);
  }

  async function runAudit() {
    setAuditing(true);
    try {
      const { error } = await supabase.functions.invoke("acq-cta-audit-30d", { body: {} });
      if (error) throw error;
      toast.success("Audit 30 jours terminé");
      await load();
    } catch (e: any) {
      toast.error(`Échec audit: ${e?.message ?? e}`);
    } finally {
      setAuditing(false);
    }
  }

  useEffect(() => { load(); }, []);

  const ctr = stats.tracked > 0 ? ((stats.clicked / stats.tracked) * 100).toFixed(1) : "0.0";

  return (
    <div className="alex-immersive min-h-screen p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-readable">Email CTA Audit</h1>
          <p className="text-readable-secondary text-sm">30 derniers jours · 1 ligne par email</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>Recharger</Button>
          <Button onClick={runAudit} disabled={auditing}>{auditing ? "Audit en cours…" : "Lancer audit 30 jours"}</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Emails envoyés", value: stats.sent, tone: "default" },
          { label: "Avec CTA tracké", value: stats.tracked, tone: "ok" },
          { label: "URL directe (non trackée)", value: stats.direct, tone: "warn" },
          { label: "Sans CTA", value: stats.missing, tone: "bad" },
          { label: `CTR (trackés) · ${ctr}%`, value: stats.clicked, tone: stats.clicked > 0 ? "ok" : "warn" },
        ].map((c) => (
          <Card key={c.label} className="glass-strong">
            <CardContent className="p-4">
              <div className="text-xs text-readable-muted">{c.label}</div>
              <div className={`text-2xl font-semibold mt-1 ${c.tone === "bad" ? "text-red-400" : c.tone === "warn" ? "text-amber-400" : c.tone === "ok" ? "text-emerald-400" : "text-readable"}`}>{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass-strong">
        <CardHeader><CardTitle>Findings par template (dernier audit)</CardTitle></CardHeader>
        <CardContent>
          {findings.length === 0 ? (
            <p className="text-readable-muted text-sm">Aucun audit exécuté. Cliquer « Lancer audit 30 jours ».</p>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Template</TableHead><TableHead>Total</TableHead>
                <TableHead>Sans URL</TableHead><TableHead>URL directe</TableHead>
                <TableHead>URL trackée</TableHead><TableHead>Cause</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {findings.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-mono text-xs">{f.template_key ?? "?"}</TableCell>
                    <TableCell>{f.total_emails}</TableCell>
                    <TableCell className={f.count_no_url > 0 ? "text-red-400" : ""}>{f.count_no_url}</TableCell>
                    <TableCell className={f.count_direct_url > 0 ? "text-amber-400" : ""}>{f.count_direct_url}</TableCell>
                    <TableCell className="text-emerald-400">{f.count_tracked_url}</TableCell>
                    <TableCell className="text-xs text-readable-secondary">{f.root_cause}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="glass-strong">
        <CardHeader><CardTitle>Derniers 100 emails</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Quand</TableHead><TableHead>Template</TableHead>
              <TableHead>Destinataire</TableHead><TableHead>CTA</TableHead>
              <TableHead>Clic</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{new Date(r.sent_at).toLocaleString("fr-CA")}</TableCell>
                  <TableCell className="font-mono text-xs">{r.template_key}</TableCell>
                  <TableCell className="text-xs">{r.to_address}</TableCell>
                  <TableCell>
                    {!r.cta_urls || r.cta_urls.length === 0 ? <Badge variant="destructive">Manquant</Badge>
                      : r.has_tracked_cta ? <Badge className="bg-emerald-600">Tracké</Badge>
                      : <Badge className="bg-amber-600">Direct</Badge>}
                  </TableCell>
                  <TableCell>{r.clicked_at ? <Badge className="bg-emerald-600">✓</Badge> : <span className="text-readable-muted">—</span>}</TableCell>
                  <TableCell><Button size="sm" variant="ghost" onClick={() => setPreview(r)}>Voir</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {preview && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <Card className="max-w-2xl w-full max-h-[80vh] overflow-auto glass-strong" onClick={(e) => e.stopPropagation()}>
            <CardHeader><CardTitle className="text-sm">{preview.message_subject}</CardTitle></CardHeader>
            <CardContent>
              <div className="text-xs text-readable-muted mb-2">CTA URLs: {(preview.cta_urls ?? []).join(", ") || "aucune"}</div>
              <pre className="whitespace-pre-wrap text-sm text-readable-secondary">{preview.rendered_text ?? "(no rendered text)"}</pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
