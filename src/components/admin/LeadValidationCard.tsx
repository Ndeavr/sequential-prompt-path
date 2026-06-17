/**
 * UNPRO — LeadValidationCard
 * Unified pre-outreach validation diagnostics: company + phone + dedupe + confidence.
 * Replaces the previous PhonePipelineCard. Every blocked record has a canonical reason.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STATUS_LABELS: Record<string, { label: string; tone: "good" | "warn" | "bad" }> = {
  valid: { label: "Valide (prêt à envoyer)", tone: "good" },
  pending_validation: { label: "En attente de validation", tone: "warn" },
  needs_review: { label: "À réviser (70-84)", tone: "warn" },
  invalid_phone: { label: "Téléphone invalide", tone: "bad" },
  invalid_company: { label: "Nom d'entreprise invalide", tone: "bad" },
  outside_quebec: { label: "Hors Québec", tone: "bad" },
  duplicate: { label: "Duplicata", tone: "bad" },
};

const PHONE_REASON_LABELS: Record<string, string> = {
  invalid_format: "Format invalide",
  bad_length: "Longueur incorrecte",
  invalid_nanp: "Numéro NANP invalide",
  blocked_pattern: "Numéro test/bloqué",
  landline: "Ligne fixe",
  carrier_rejected: "Rejeté par opérateur",
  opt_out: "Désabonné (STOP)",
  outside_quebec: "Hors Québec",
  missing_country_code: "Indicatif pays manquant",
  missing_phone: "Téléphone manquant",
  lookup_failed: "Lookup Twilio échoué",
};

const COMPANY_REASON_LABELS: Record<string, string> = {
  empty_company: "Nom vide",
  too_short: "Nom trop court",
  category_word_only: "Mot de catégorie seulement",
  contains_phone: "Contient un numéro",
  contains_city_only: "Ville seulement",
  reserved_keyword: "Mot réservé (unknown, test…)",
  low_confidence: "Faible confiance",
  duplicate_company: "Doublon entreprise",
};

export function LeadValidationCard() {
  const [statuses, setStatuses] = useState<Record<string, number>>({});
  const [phoneReasons, setPhoneReasons] = useState<Record<string, number>>({});
  const [companyReasons, setCompanyReasons] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("contractor_leads")
      .select("validation_status,phone_failure_reason,company_failure_reason")
      .limit(10000);
    if (error) { setLoading(false); return; }
    const s: Record<string, number> = {};
    const p: Record<string, number> = {};
    const co: Record<string, number> = {};
    for (const row of data ?? []) {
      const st = (row as any).validation_status || "pending_validation";
      s[st] = (s[st] || 0) + 1;
      const pr = (row as any).phone_failure_reason;
      if (pr) p[pr] = (p[pr] || 0) + 1;
      const cr = (row as any).company_failure_reason;
      if (cr) co[cr] = (co[cr] || 0) + 1;
    }
    setStatuses(s);
    setPhoneReasons(p);
    setCompanyReasons(co);
    setTotal((data ?? []).length);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const valid = statuses.valid || 0;
  const validPct = total > 0 ? ((valid / total) * 100).toFixed(1) : "0";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Validation des prospects (avant outreach)</span>
          <span className="text-sm font-normal text-muted-foreground">
            {valid.toLocaleString()} / {total.toLocaleString()} prêts à envoyer ({validPct}%)
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
                {Object.entries(STATUS_LABELS).map(([key, { label, tone }]) => {
                  const n = statuses[key] || 0;
                  const cls = tone === "good" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : "text-red-600";
                  return (
                    <div key={key} className="flex items-center justify-between rounded border px-3 py-2">
                      <span className="truncate">{label}</span>
                      <span className={`font-mono ${cls}`}>{n.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {Object.keys(phoneReasons).length > 0 && (
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                  Raisons — téléphone
                </div>
                <div className="space-y-1 text-sm">
                  {Object.entries(phoneReasons).sort((a, b) => b[1] - a[1]).map(([key, n]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{PHONE_REASON_LABELS[key] || key}</span>
                      <span className="font-mono">{n.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Object.keys(companyReasons).length > 0 && (
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                  Raisons — entreprise
                </div>
                <div className="space-y-1 text-sm">
                  {Object.entries(companyReasons).sort((a, b) => b[1] - a[1]).map(([key, n]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{COMPANY_REASON_LABELS[key] || key}</span>
                      <span className="font-mono">{n.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              KPI réel : <strong>Entreprise valide + Mobile Québec valide → SMS livré → Clic → Activation</strong>.
              Aucun lead ne sort vers Twilio s'il n'est pas <code>validation_status='valid'</code> avec scores ≥ 85.
              Chaque blocage porte une raison canonique — jamais <code>unknown</code>.
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
