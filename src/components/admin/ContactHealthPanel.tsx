/**
 * UNPRO — Contact Health Panel
 * SMS vs Email delivery KPIs + phone-type breakdown for contractor_leads.
 */
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Phone, Mail, AlertTriangle, CheckCircle2 } from "lucide-react";

type Row = {
  phone_type: string | null;
  sms_status: string | null;
  email_status: string | null;
  contact_method: string | null;
  sms_disabled: boolean | null;
  sms_failed_attempts: number | null;
  sms_suppressed_reason: string | null;
  last_sms_error_code: string | null;
};

const PHONE_BADGE: Record<string, { icon: string; label: string }> = {
  mobile: { icon: "📱", label: "Mobile" },
  landline: { icon: "☎️", label: "Landline" },
  voip: { icon: "🌐", label: "VoIP" },
  unknown: { icon: "❓", label: "Unknown" },
};

export default function ContactHealthPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-contact-health"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contractor_leads")
        .select("phone_type, sms_status, email_status, contact_method, sms_disabled, sms_failed_attempts, sms_suppressed_reason, last_sms_error_code")
        .limit(5000);
      return (data ?? []) as Row[];
    },
    staleTime: 30_000,
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  const rows = data ?? [];

  const byPhoneType: Record<string, number> = {};
  const smsCount = { sent: 0, delivered: 0, failed: 0 };
  const emailCount = { sent: 0, opened: 0, replied: 0, bounced: 0 };
  const errorCodes: Record<string, number> = {};
  const suppressed: Row[] = [];

  rows.forEach((r) => {
    const pt = r.phone_type ?? "unknown";
    byPhoneType[pt] = (byPhoneType[pt] ?? 0) + 1;
    if (r.sms_status === "delivered") { smsCount.delivered += 1; smsCount.sent += 1; }
    else if (r.sms_status === "failed" || r.sms_status === "undelivered") { smsCount.failed += 1; smsCount.sent += 1; }
    else if (r.sms_status === "sent" || r.sms_status === "queued" || r.sms_status === "sending") { smsCount.sent += 1; }
    if (r.email_status && (emailCount as any)[r.email_status] != null) (emailCount as any)[r.email_status] += 1;
    if (r.last_sms_error_code) errorCodes[r.last_sms_error_code] = (errorCodes[r.last_sms_error_code] ?? 0) + 1;
    if (r.sms_suppressed_reason === "permanent_suppression") suppressed.push(r);
  });

  const deliverability = smsCount.sent > 0 ? Math.round((smsCount.delivered / smsCount.sent) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile icon={<Phone className="h-4 w-4 text-primary" />} label="SMS envoyés" value={smsCount.sent} />
        <KpiTile icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} label="SMS livrés" value={smsCount.delivered} sub={`${deliverability}% deliverability`} />
        <KpiTile icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} label="SMS échoués" value={smsCount.failed} />
        <KpiTile icon={<Mail className="h-4 w-4 text-primary" />} label="Emails envoyés" value={emailCount.sent} sub={`${emailCount.opened} ouverts · ${emailCount.replied} répondus`} />
      </div>

      {/* Phone type breakdown */}
      <Card className="border-border/40">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Répartition des numéros</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(byPhoneType).sort(([, a], [, b]) => b - a).map(([t, n]) => {
              const meta = PHONE_BADGE[t] ?? PHONE_BADGE.unknown;
              return (
                <Badge key={t} variant="outline" className="text-xs gap-1">
                  <span>{meta.icon}</span>{meta.label}<span className="text-muted-foreground ml-1">{n}</span>
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Error codes + suppression */}
      <div className="grid md:grid-cols-2 gap-3">
        <Card className="border-border/40">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top erreurs Twilio</CardTitle></CardHeader>
          <CardContent>
            {Object.keys(errorCodes).length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucune erreur.</p>
            ) : (
              <ul className="space-y-1 text-xs">
                {Object.entries(errorCodes).sort(([, a], [, b]) => b - a).slice(0, 6).map(([code, n]) => (
                  <li key={code} className="flex justify-between"><span className="font-mono">{code}</span><span className="text-muted-foreground">{n}</span></li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardHeader className="pb-2"><CardTitle className="text-sm">SMS suspendus définitivement</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">{suppressed.length}</p>
            <p className="text-xs text-muted-foreground">numéros bloqués après 5 échecs</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiTile({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number; sub?: string }) {
  return (
    <Card className="border-border/40">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
        <p className="text-2xl font-semibold text-foreground mt-1">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
