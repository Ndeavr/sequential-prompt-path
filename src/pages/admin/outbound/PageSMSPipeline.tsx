/**
 * UNPRO — SMS Outbound Dashboard
 * Live metrics: sent / delivered / failed / replied / booked
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  MessageSquare, Send, CheckCircle2, XCircle,
  MessageCircle, CalendarCheck, RefreshCw, Loader2,
  Ban, Clock
} from "lucide-react";
import { useState } from "react";

const SMS_STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  none: { label: "—", variant: "outline" },
  sent: { label: "Envoyé", variant: "secondary" },
  delivered: { label: "Livré", variant: "default" },
  failed: { label: "Échoué", variant: "destructive" },
  undelivered: { label: "Non livré", variant: "destructive" },
};

export default function PageSMSPipeline() {
  const [sendingId, setSendingId] = useState<string | null>(null);

  const { data: prospects, isLoading, refetch } = useQuery({
    queryKey: ["sms-pipeline"],
    queryFn: async () => {
      const { data } = await (supabase.from("contractors_prospects") as any)
        .select("id, business_name, city, category, phone, email, sms_status, sms_sent_at, sms_replied, sms_reply_text, sms_booked, sms_opted_out, sms_attempt_count, sms_queue_status")
        .not("phone", "is", null)
        .order("sms_sent_at", { ascending: false, nullsFirst: false })
        .limit(100);
      return (data || []) as any[];
    },
    refetchInterval: 10000,
  });

  // Compute metrics
  const today = new Date().toISOString().slice(0, 10);
  const sentToday = prospects?.filter((p: any) => p.sms_sent_at?.startsWith(today)).length || 0;
  const totalSent = prospects?.filter((p: any) => p.sms_status && p.sms_status !== "none").length || 0;
  const delivered = prospects?.filter((p: any) => p.sms_status === "delivered").length || 0;
  const failed = prospects?.filter((p: any) => p.sms_status === "failed" || p.sms_status === "undelivered").length || 0;
  const replied = prospects?.filter((p: any) => p.sms_replied).length || 0;
  const booked = prospects?.filter((p: any) => p.sms_booked).length || 0;
  const optedOut = prospects?.filter((p: any) => p.sms_opted_out).length || 0;
  const ready = prospects?.filter((p: any) => p.phone && (!p.sms_status || p.sms_status === "none") && !p.sms_opted_out).length || 0;

  const handleSendSMS = async (prospect: any) => {
    setSendingId(prospect.id);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/send-sms-prospect`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prospect_id: prospect.id,
            phone: prospect.phone,
            first_name: prospect.business_name?.split(" ")[0] || "",
            company_name: prospect.business_name || "",
            template: "intro",
          }),
        }
      );
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else if (data.skipped) {
        toast.info(data.error || "Envoi ignoré");
      } else {
        toast.success(`SMS envoyé à ${prospect.business_name}`);
        refetch();
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSendingId(null);
    }
  };

  const kpis = [
    { label: "Envoyés aujourd'hui", value: sentToday, icon: Send, color: "text-blue-400" },
    { label: "Total envoyés", value: totalSent, icon: MessageSquare, color: "text-primary" },
    { label: "Livrés", value: delivered, icon: CheckCircle2, color: "text-emerald-400" },
    { label: "Échoués", value: failed, icon: XCircle, color: "text-red-400" },
    { label: "Répondu", value: replied, icon: MessageCircle, color: "text-amber-400" },
    { label: "Booké 🎯", value: booked, icon: CalendarCheck, color: "text-green-400" },
    { label: "STOP", value: optedOut, icon: Ban, color: "text-red-300" },
    { label: "Prêts à envoyer", value: ready, icon: Clock, color: "text-cyan-400" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">📱 SMS Sniper</h1>
            <p className="text-sm text-muted-foreground">Pipeline SMS — Alex d'UNPRO</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Rafraîchir
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.map((kpi) => (
            <Card key={kpi.label} className="border-border/40">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                  <span className="text-xs text-muted-foreground">{kpi.label}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Prospect Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Prospects avec téléphone</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entreprise</TableHead>
                      <TableHead>Ville</TableHead>
                      <TableHead>Téléphone</TableHead>
                      <TableHead>Statut SMS</TableHead>
                      <TableHead>Envoyé</TableHead>
                      <TableHead>Répondu</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prospects?.map((p: any) => {
                      const badge = SMS_STATUS_BADGE[p.sms_status] || SMS_STATUS_BADGE.none;
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium text-sm">{p.business_name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{p.city}</TableCell>
                          <TableCell className="text-sm font-mono">{p.phone}</TableCell>
                          <TableCell>
                            <Badge variant={badge.variant} className="text-xs">
                              {badge.label}
                            </Badge>
                            {p.sms_opted_out && (
                              <Badge variant="destructive" className="text-xs ml-1">STOP</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {p.sms_sent_at ? new Date(p.sms_sent_at).toLocaleDateString("fr-CA") : "—"}
                          </TableCell>
                          <TableCell>
                            {p.sms_replied ? (
                              <span className="text-xs text-amber-400">✓ {p.sms_reply_text?.slice(0, 30) || "Oui"}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {p.sms_opted_out ? (
                              <span className="text-xs text-red-400">Opt-out</span>
                            ) : (!p.sms_status || p.sms_status === "none") ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1"
                                disabled={sendingId === p.id}
                                onClick={() => handleSendSMS(p)}
                              >
                                {sendingId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                Envoyer
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                ×{p.sms_attempt_count || 1}
                              </span>
                            )}
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
    </AdminLayout>
  );
}
