import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type FailingRow = {
  id: string;
  company_name: string | null;
  phone_original: string | null;
  phone_normalized: string | null;
  area_code: string | null;
  validation_status: string | null;
  phone_validation_status: string | null;
  validation_reason: string | null;
  phone_type: string | null;
  twilio_http_status: number | null;
  twilio_lookup_body: any;
  has_email: boolean;
};

type AuditPayload = {
  ok: boolean;
  distribution: Record<string, number>;
  duplicates_count: number;
  failing_first_50: FailingRow[];
  scraper_quality: Record<string, number>;
  final_report: {
    contactable_today_sms: number;
    email_fallback_only: number;
    unusable: number;
    total: number;
  };
};

export default function ValidationDebugPanel() {
  const [data, setData] = useState<AuditPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [revalidating, setRevalidating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: out, error: err } = await supabase.functions.invoke("acq-validation-audit", { body: {} });
      if (err) throw err;
      setData(out as AuditPayload);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const revalidate = async () => {
    setRevalidating(true);
    try {
      // Reset pending then trigger worker
      await (supabase as any)
        .from("contractor_leads")
        .update({ validation_status: "pending_validation" })
        .neq("validation_status", "valid");
      const { error: err } = await supabase.functions.invoke("validate-lead-phones", { body: {} });
      if (err) throw err;
      toast.success("Re-validation lancée");
      setTimeout(() => void load(), 1500);
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    } finally {
      setRevalidating(false);
    }
  };

  if (loading) return <Card className="p-4 text-sm text-muted-foreground">Chargement de l'audit…</Card>;
  if (error) return (
    <Card className="p-4 border-red-500/40 bg-red-500/5">
      <div className="text-sm text-red-300 mb-2">Audit indisponible : {error}</div>
      <Button size="sm" onClick={load}>Réessayer</Button>
    </Card>
  );
  if (!data) return null;

  const d = data.distribution;
  const fr = data.final_report;
  const q = data.scraper_quality;

  return (
    <div className="space-y-4">
      {/* Final report */}
      <Card className="p-4 border-emerald-500/30 bg-emerald-500/5">
        <h2 className="text-sm font-semibold mb-3">Rapport final — {fr.total} prospects</h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 rounded-md border border-emerald-500/40 bg-emerald-500/10">
            <div className="text-2xl font-bold text-emerald-300">{fr.contactable_today_sms}</div>
            <div className="text-[10px] uppercase tracking-wide text-emerald-200/80 mt-1">Contactables SMS aujourd'hui</div>
          </div>
          <div className="p-3 rounded-md border border-blue-500/40 bg-blue-500/10">
            <div className="text-2xl font-bold text-blue-300">{fr.email_fallback_only}</div>
            <div className="text-[10px] uppercase tracking-wide text-blue-200/80 mt-1">Email seulement</div>
          </div>
          <div className="p-3 rounded-md border border-red-500/40 bg-red-500/10">
            <div className="text-2xl font-bold text-red-300">{fr.unusable}</div>
            <div className="text-[10px] uppercase tracking-wide text-red-200/80 mt-1">Inutilisables</div>
          </div>
        </div>
        <div className="flex justify-end mt-3 gap-2">
          <Button size="sm" variant="outline" onClick={load}>Recharger</Button>
          <Button size="sm" onClick={revalidate} disabled={revalidating}>
            {revalidating ? "Re-validation…" : "Re-valider tous les leads"}
          </Button>
        </div>
      </Card>

      {/* Distribution */}
      <Card className="p-4">
        <h2 className="text-sm font-semibold mb-3">Distribution des {d.total} leads</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <Bucket label="Valide (SMS)" value={d.valid} tone="emerald" />
          <Bucket label="Valide (lookup indispo)" value={d.valid_tentative} tone="emerald" />
          <Bucket label="Sans téléphone" value={d.missing_phone} tone="amber" />
          <Bucket label="Format invalide" value={d.invalid_format} tone="red" />
          <Bucket label="NANP invalide" value={d.invalid_nanp} tone="red" />
          <Bucket label="Landline" value={d.landline} tone="amber" />
          <Bucket label="Hors Québec" value={d.outside_quebec} tone="red" />
          <Bucket label="Lookup indisponible" value={(d.lookup_unavailable ?? 0) + (d.lookup_failed ?? 0)} tone="amber" />
          <Bucket label="En attente" value={d.pending_validation} tone="blue" />
          <Bucket label="Duplicata" value={d.duplicate} tone="red" />
          <Bucket label="Avec email" value={d.with_email} tone="blue" />
        </div>
      </Card>

      {/* Scraper quality */}
      <Card className="p-4">
        <h2 className="text-sm font-semibold mb-3">Qualité scraper — échantillon de {q.sample_size}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <Bucket label="Mobile" value={`${q.mobile_pct}%`} tone="emerald" />
          <Bucket label="Landline" value={`${q.landline_pct}%`} tone="amber" />
          <Bucket label="VoIP" value={`${q.voip_pct}%`} tone="blue" />
          <Bucket label="Sans téléphone" value={`${q.missing_phone_pct}%`} tone="amber" />
          <Bucket label="Invalide" value={`${q.invalid_pct}%`} tone="red" />
          <Bucket label="Duplicata" value={`${q.duplicate_pct}%`} tone="red" />
          <Bucket label="Avec email" value={`${q.with_email_pct}%`} tone="blue" />
        </div>
      </Card>

      {/* Failing rows */}
      <Card className="p-4">
        <h2 className="text-sm font-semibold mb-3">50 premiers échecs de validation</h2>
        {data.failing_first_50.length === 0 ? (
          <div className="text-sm text-muted-foreground">Aucun échec. 🎉</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground border-b border-border">
                  <th className="py-2 pr-2">Entreprise</th>
                  <th className="py-2 pr-2">Téléphone brut</th>
                  <th className="py-2 pr-2">E.164</th>
                  <th className="py-2 pr-2">Statut</th>
                  <th className="py-2 pr-2">Raison</th>
                  <th className="py-2 pr-2">Twilio</th>
                  <th className="py-2 pr-2">Email</th>
                  <th className="py-2 pr-2"></th>
                </tr>
              </thead>
              <tbody>
                {data.failing_first_50.map((r) => (
                  <>
                    <tr key={r.id} className="border-b border-border/40">
                      <td className="py-2 pr-2 font-medium">{r.company_name ?? "—"}</td>
                      <td className="py-2 pr-2 font-mono">{r.phone_original ?? "—"}</td>
                      <td className="py-2 pr-2 font-mono">{r.phone_normalized ?? "—"}</td>
                      <td className="py-2 pr-2">
                        <Badge variant="outline" className="text-[10px]">{r.phone_validation_status ?? "—"}</Badge>
                      </td>
                      <td className="py-2 pr-2 text-red-300">{r.validation_reason ?? "—"}</td>
                      <td className="py-2 pr-2 font-mono">
                        {r.twilio_http_status ? `HTTP ${r.twilio_http_status}` : "—"}
                      </td>
                      <td className="py-2 pr-2">{r.has_email ? "✓" : "—"}</td>
                      <td className="py-2 pr-2">
                        {r.twilio_lookup_body && (
                          <button
                            className="text-[10px] underline text-muted-foreground"
                            onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                          >
                            {expanded === r.id ? "Masquer" : "Voir body"}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expanded === r.id && r.twilio_lookup_body && (
                      <tr key={r.id + "-body"}>
                        <td colSpan={8} className="py-2 pr-2">
                          <pre className="text-[10px] bg-muted/50 rounded-md p-2 overflow-x-auto max-w-full whitespace-pre-wrap break-all">
                            {JSON.stringify(r.twilio_lookup_body, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Bucket({ label, value, tone }: { label: string; value: number | string; tone: "emerald" | "red" | "amber" | "blue" }) {
  const colors = {
    emerald: "border-emerald-500/30 bg-emerald-500/5 text-emerald-200",
    red: "border-red-500/30 bg-red-500/5 text-red-200",
    amber: "border-amber-500/30 bg-amber-500/5 text-amber-200",
    blue: "border-blue-500/30 bg-blue-500/5 text-blue-200",
  }[tone];
  return (
    <div className={`p-2 rounded border ${colors}`}>
      <div className="text-[10px] uppercase tracking-wide opacity-80">{label}</div>
      <div className="text-base font-semibold mt-0.5">{value}</div>
    </div>
  );
}
