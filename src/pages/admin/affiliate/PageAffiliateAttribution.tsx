/**
 * UNPRO — Admin Attribution affiliée
 * Route: /admin/affiliates/attribution
 * Chaîne auditable : Affiliée → prospects → audits → conversions → commissions.
 * Source marquée « Fourni par UNPRO » / « Trouvé par l'affiliée ».
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, MousePointerClick, Sparkles, DollarSign, ChevronDown, ChevronUp } from "lucide-react";

function formatCents(cents: number) {
  return `${(cents / 100).toLocaleString("fr-CA", { maximumFractionDigits: 0 })} $`;
}

export default function PageAffiliateAttribution() {
  const [openAffiliate, setOpenAffiliate] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-affiliate-attribution"],
    queryFn: async () => {
      const [affs, leads, audits, convs] = await Promise.all([
        (supabase as any).from("affiliates").select("id, name, slug, status, created_at").order("created_at", { ascending: false }).limit(500),
        (supabase as any)
          .from("contractor_leads")
          .select("id, business_name, company_name, city, source_type, created_by_affiliate_id, last_contacted_by, created_at")
          .order("created_at", { ascending: false })
          .limit(2000),
        (supabase as any)
          .from("ai_recommendation_audits")
          .select("id, affiliate_id, lead_id, business_name, sent_at, opened_at, started_at, completed_at, status, created_at")
          .order("created_at", { ascending: false })
          .limit(2000),
        (supabase as any)
          .from("affiliate_conversions")
          .select("id, affiliate_id, lead_id, value_cents, commission_amount_cents, commission_kind, status, created_at")
          .order("created_at", { ascending: false })
          .limit(2000),
      ]);
      return {
        affiliates: affs.data ?? [],
        leads: leads.data ?? [],
        audits: audits.data ?? [],
        conversions: convs.data ?? [],
      };
    },
  });

  const rows = useMemo(() => {
    if (!data) return [];
    return data.affiliates.map((a: any) => {
      const myLeads = data.leads.filter(
        (l: any) => l.created_by_affiliate_id === a.id || l.last_contacted_by === a.id
      );
      const myAudits = data.audits.filter((x: any) => x.affiliate_id === a.id);
      const myConvs = data.conversions.filter((c: any) => c.affiliate_id === a.id);
      const commissionCents = myConvs
        .filter((c: any) => c.status !== "reversed")
        .reduce((s: number, c: any) => s + (c.commission_amount_cents || 0), 0);
      return {
        affiliate: a,
        leads: myLeads,
        audits: myAudits,
        conversions: myConvs,
        commissionCents,
        sent: myAudits.filter((x: any) => x.sent_at).length,
        opened: myAudits.filter((x: any) => x.opened_at).length,
        completed: myAudits.filter((x: any) => x.completed_at).length,
      };
    });
  }, [data]);

  const totals = useMemo(
    () => ({
      affiliates: rows.length,
      leads: rows.reduce((s, r) => s + r.leads.length, 0),
      audits: rows.reduce((s, r) => s + r.sent, 0),
      commissions: rows.reduce((s, r) => s + r.commissionCents, 0),
    }),
    [rows]
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Attribution affiliée</h1>
        <p className="text-sm text-muted-foreground">
          Affiliée → prospects → audits → conversions → commissions. Historique auditable.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi icon={Users} label="Affiliées" value={String(totals.affiliates)} />
        <Kpi icon={MousePointerClick} label="Prospects touchés" value={String(totals.leads)} />
        <Kpi icon={Sparkles} label="Audits envoyés" value={String(totals.audits)} />
        <Kpi icon={DollarSign} label="Commissions" value={formatCents(totals.commissions)} />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const open = openAffiliate === r.affiliate.id;
            return (
              <Card key={r.affiliate.id} className="overflow-hidden">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 p-4 text-left"
                  onClick={() => setOpenAffiliate(open ? null : r.affiliate.id)}
                >
                  <div>
                    <p className="font-semibold">{r.affiliate.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.leads.length} prospects · {r.sent} envoyés · {r.opened} ouverts · {r.completed} terminés ·{" "}
                      {r.conversions.length} conversions
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{formatCents(r.commissionCents)}</Badge>
                    {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </button>

                {open && (
                  <CardContent className="border-t border-border/40 pt-4">
                    {r.leads.length === 0 && r.audits.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aucune activité pour l'instant.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-xs text-muted-foreground">
                              <th className="p-2">Prospect</th>
                              <th className="p-2">Source</th>
                              <th className="p-2">Audit</th>
                              <th className="p-2">Conversion</th>
                            </tr>
                          </thead>
                          <tbody>
                            {r.leads.map((l: any) => {
                              const audit = r.audits.find((x: any) => x.lead_id === l.id);
                              const conv = r.conversions.find((c: any) => c.lead_id === l.id);
                              const own = l.created_by_affiliate_id === r.affiliate.id;
                              return (
                                <tr key={l.id} className="border-t border-border/30">
                                  <td className="p-2">
                                    <p className="font-medium">{l.business_name ?? l.company_name ?? "—"}</p>
                                    <p className="text-xs text-muted-foreground">{l.city ?? ""}</p>
                                  </td>
                                  <td className="p-2">
                                    <Badge variant={own ? "default" : "secondary"}>
                                      {own ? "Trouvé par l'affiliée" : "Fourni par UNPRO"}
                                    </Badge>
                                  </td>
                                  <td className="p-2 text-xs">
                                    {audit
                                      ? audit.completed_at
                                        ? "Terminé"
                                        : audit.started_at
                                          ? "Commencé"
                                          : audit.opened_at
                                            ? "Ouvert"
                                            : audit.sent_at
                                              ? "Envoyé"
                                              : "Créé"
                                      : "—"}
                                  </td>
                                  <td className="p-2 text-xs">
                                    {conv ? `${formatCents(conv.value_cents ?? 0)} · ${conv.status}` : "—"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
