/**
 * UNPRO — /admin/operations-health
 * Exception center: every prospect stuck in the funnel, with the exact exit point
 * and one-click recovery actions. All data comes from v_prospect_funnel.
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Activity, RefreshCw, Send, AlertTriangle } from "lucide-react";
import { useCampaignFunnel, useProspectFunnel, STAGE_LABELS } from "@/hooks/useCampaignFunnel";

const EXCEPTION_STAGES = [
  { key: "sent", label: "Sans confirmation de livraison" },
  { key: "undelivered", label: "Non livrés" },
  { key: "send_failed", label: "Échecs d'envoi" },
  { key: "delivered", label: "Livrés sans clic" },
  { key: "clicked", label: "Cliqués sans inscription" },
  { key: "registered", label: "Inscrits sans checkout" },
  { key: "checkout_opened", label: "Checkout sans paiement" },
];

export default function PageAdminOperationsHealth() {
  const [stage, setStage] = useState("sent");
  const [busy, setBusy] = useState<string | null>(null);
  const { rows: campaigns } = useCampaignFunnel();
  const { rows, loading, reload } = useProspectFunnel({ stage, limit: 200 });

  const totals = campaigns.reduce(
    (acc, c) => ({
      sent: acc.sent + c.sent,
      delivered: acc.delivered + c.delivered,
      noCallback: acc.noCallback + c.no_callback,
      undelivered: acc.undelivered + c.undelivered + c.failed,
      clicked: acc.clicked + c.clicked,
      paid: acc.paid + c.paid,
    }),
    { sent: 0, delivered: 0, noCallback: 0, undelivered: 0, clicked: 0, paid: 0 },
  );

  const invoke = async (name: string, body: Record<string, unknown>, label: string) => {
    setBusy(name);
    try {
      const { data, error } = await supabase.functions.invoke(name, { body });
      if (error) throw error;
      toast.success(`${label} — terminé`, { description: JSON.stringify(data).slice(0, 160) });
      reload();
    } catch (e) {
      toast.error(`${label} — échec`, { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="admin-theme min-h-screen bg-background text-foreground p-4">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="space-y-1">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-readable">Santé des opérations</h1>
            <Badge variant="outline" className="ml-auto text-[10px]">refresh 15s</Badge>
          </div>
          <p className="text-xs text-readable-muted">
            Où chaque prospect sort du tunnel, et comment le récupérer.
          </p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {[
            { l: "Envoyés", v: totals.sent },
            { l: "Livrés", v: totals.delivered },
            { l: "Sans callback", v: totals.noCallback },
            { l: "Non livrés", v: totals.undelivered },
            { l: "Clics", v: totals.clicked },
            { l: "Payés", v: totals.paid },
          ].map((k) => (
            <Card key={k.l}>
              <CardContent className="p-3">
                <p className="text-[10px] uppercase tracking-wider text-readable-muted">{k.l}</p>
                <p className="text-xl font-bold tabular-nums">{k.v}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={busy !== null}
            onClick={() => invoke("twilio-delivery-reconcile", { limit: 200 }, "Réconciliation Twilio")}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Réconcilier les livraisons
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy !== null}
            onClick={() => invoke("second-touch-outreach", { dry_run: true, limit: 25 }, "Relance (simulation)")}
          >
            <Send className="h-3.5 w-3.5 mr-1.5" /> Relance — simulation
          </Button>
          <Button
            size="sm"
            disabled={busy !== null}
            onClick={() => invoke("second-touch-outreach", { dry_run: false, limit: 25 }, "Relance envoyée")}
          >
            <Send className="h-3.5 w-3.5 mr-1.5" /> Relance — envoyer 25
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {EXCEPTION_STAGES.map((s) => (
            <Button
              key={s.key}
              size="sm"
              variant={stage === s.key ? "default" : "outline"}
              className="text-[11px] h-7"
              onClick={() => setStage(s.key)}
            >
              {s.label}
            </Button>
          ))}
        </div>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            {loading ? (
              <p className="p-4 text-xs text-readable-muted">Chargement…</p>
            ) : rows.length === 0 ? (
              <p className="p-4 text-xs text-readable-muted">Aucune exception à cette étape.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="text-[10px] uppercase">
                    <TableHead>Entreprise</TableHead>
                    <TableHead>Ville</TableHead>
                    <TableHead>Étape</TableHead>
                    <TableHead>Dernier SID</TableHead>
                    <TableHead>Erreur</TableHead>
                    <TableHead className="text-right">Dernière activité</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.prospect_id} className="text-xs">
                      <TableCell className="font-medium">{r.business_name ?? "—"}</TableCell>
                      <TableCell>{r.city ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {STAGE_LABELS[r.current_stage] ?? r.current_stage}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-[10px]">
                        {r.last_sid ? `${r.last_sid.slice(0, 10)}…` : "—"}
                      </TableCell>
                      <TableCell className="text-amber-400 text-[10px] max-w-[220px] truncate">
                        {r.last_error ?? "—"}
                      </TableCell>
                      <TableCell className="text-right text-[10px] text-readable-muted">
                        {r.last_activity_at ? new Date(r.last_activity_at).toLocaleString("fr-CA") : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <p className="text-[10px] text-readable-muted text-center flex items-center justify-center gap-1">
          <AlertTriangle className="h-3 w-3" /> Données live · vues Postgres · aucun mock.
        </p>
      </div>
    </div>
  );
}
