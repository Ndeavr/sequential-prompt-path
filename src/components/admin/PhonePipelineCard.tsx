/**
 * UNPRO — PhonePipelineCard
 * Shows actionable phone-validation diagnostics for the SMS pipeline.
 * Replaces the generic "unknown 103" bucket with named statuses and reasons.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type StatusRow = { phone_validation_status: string | null; phone_failure_reason: string | null; count: number };

const STATUS_LABELS: Record<string, string> = {
  pending_validation: "En attente de validation",
  valid_mobile: "Mobile valide",
  valid_voip: "VoIP valide",
  landline: "Ligne fixe (bloqué)",
  invalid_phone: "Format invalide",
  outside_quebec: "Hors Québec",
  do_not_contact: "Ne pas contacter",
  lookup_failed: "Lookup échoué",
};

const REASON_LABELS: Record<string, string> = {
  invalid_format: "Format invalide",
  bad_length: "Longueur incorrecte",
  invalid_nanp: "Numéro NANP invalide",
  blocked_pattern: "Numéro test/bloqué",
  landline: "Ligne fixe",
  carrier_rejected: "Rejeté par opérateur",
  opt_out: "Désabonné (STOP)",
  outside_quebec: "Hors Québec",
  missing_country_code: "Indicatif pays manquant",
  lookup_failed: "Lookup Twilio échoué",
};

export function PhonePipelineCard() {
  const [statuses, setStatuses] = useState<Record<string, number>>({});
  const [reasons, setReasons] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("contractor_leads")
      .select("phone_validation_status,phone_failure_reason")
      .not("phone", "is", null)
      .limit(10000);
    if (error) { setLoading(false); return; }
    const s: Record<string, number> = {};
    const r: Record<string, number> = {};
    for (const row of data ?? []) {
      const st = (row as any).phone_validation_status || "unknown";
      s[st] = (s[st] || 0) + 1;
      const rs = (row as any).phone_failure_reason;
      if (rs) r[rs] = (r[rs] || 0) + 1;
    }
    setStatuses(s);
    setReasons(r);
    setTotal((data ?? []).length);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const valid = (statuses.valid_mobile || 0) + (statuses.valid_voip || 0);
  const validPct = total > 0 ? ((valid / total) * 100).toFixed(1) : "0";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Pipeline téléphone</span>
          <span className="text-sm font-normal text-muted-foreground">
            {valid.toLocaleString()} / {total.toLocaleString()} valides ({validPct}%)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-sm text-muted-foreground">Chargement…</div>
        ) : (
          <>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                Statut de validation
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(STATUS_LABELS).map(([key, label]) => {
                  const n = statuses[key] || 0;
                  const tone =
                    key === "valid_mobile" || key === "valid_voip"
                      ? "text-emerald-600"
                      : key === "pending_validation"
                      ? "text-amber-600"
                      : "text-red-600";
                  return (
                    <div key={key} className="flex items-center justify-between rounded border px-3 py-2">
                      <span className="truncate">{label}</span>
                      <span className={`font-mono ${tone}`}>{n.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {Object.keys(reasons).length > 0 && (
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                  Raisons d'échec (diagnostic)
                </div>
                <div className="space-y-1 text-sm">
                  {Object.entries(reasons)
                    .sort((a, b) => b[1] - a[1])
                    .map(([key, n]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-muted-foreground">{REASON_LABELS[key] || key}</span>
                        <span className="font-mono">{n.toLocaleString()}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              KPI réel : <strong>Mobile Québec valide → SMS livré → Clic → Activation</strong>.
              Aucun numéro ne sort vers Twilio s'il n'est pas <code>valid_mobile</code> ou <code>valid_voip</code>.
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
