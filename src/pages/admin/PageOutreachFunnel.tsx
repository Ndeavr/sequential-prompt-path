/**
 * PageOutreachFunnel — /admin/outreach-funnel
 * KPIs + pipeline canonique pour l'acquisition entrepreneur.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Radio, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Kpis {
  scraped: number; ready_to_contact: number; sms_queued: number; sms_sent: number;
  sms_delivered: number; sms_failed: number; sms_clicked: number; landing_viewed: number;
  signup_started: number; profile_started: number; checkout_started: number;
  paid_1_dollar: number; activated: number; recommendable: number;
}

const STAGES: Array<{ key: keyof Kpis; label: string }> = [
  { key: "scraped", label: "Scrapé" },
  { key: "ready_to_contact", label: "Prêt à contacter" },
  { key: "sms_sent", label: "SMS envoyé" },
  { key: "sms_delivered", label: "Livré" },
  { key: "sms_clicked", label: "Cliqué" },
  { key: "landing_viewed", label: "Page vue" },
  { key: "profile_started", label: "Profil édité" },
  { key: "checkout_started", label: "Checkout" },
  { key: "paid_1_dollar", label: "Paiement confirmé" },
  { key: "activated", label: "Activé" },
  { key: "recommendable", label: "Recommandable" },
];

export default function PageOutreachFunnel() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [selectedStage, setSelectedStage] = useState<keyof Kpis | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("v_outreach_funnel_kpis" as any).select("*").maybeSingle();
      setKpis((data as unknown) as Kpis | null);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedStage) { setRows([]); return; }
    (async () => {
      const q = supabase
        .from("verified_contractor_prospects")
        .select("id, business_name, city, category, phone_e164, outreach_status, source, updated_at, outreach_sent_at, outreach_delivered_at, outreach_clicked_at, verification_status, sms_eligible, sms_eligibility_tier")
        .order("updated_at", { ascending: false })
        .limit(100);
      let query = q;
      if (selectedStage === "ready_to_contact") {
        query = query.eq("verification_status", "verified").eq("sms_eligible", true).in("sms_eligibility_tier", ["A", "B", "C"]).eq("outreach_status", "none");
      } else if (selectedStage === "sms_sent") {
        query = query.in("outreach_status", ["sent", "delivered", "clicked", "activated"]);
      } else if (selectedStage === "sms_delivered") {
        query = query.in("outreach_status", ["delivered", "clicked", "activated"]);
      } else if (selectedStage === "sms_clicked" || selectedStage === "landing_viewed") {
        query = query.not("outreach_clicked_at", "is", null);
      } else if (selectedStage === "sms_failed") {
        query = query.eq("outreach_status", "failed");
      } else if (selectedStage === "activated" || selectedStage === "recommendable") {
        query = query.eq("outreach_status", "activated");
      } else if (selectedStage !== "scraped") {
        setRows([]);
        return;
      }
      const { data } = await query;
      setRows(data ?? []);
    })();
  }, [selectedStage]);

  return (
    <div className="admin-theme min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
              <span className="text-[10px] uppercase tracking-widest text-emerald-400">ACQUISITION ENTREPRENEUR</span>
            </div>
            <h1 className="text-3xl font-bold text-readable">Outreach Funnel</h1>
            <p className="text-sm text-readable-muted mt-1">
              Inventaire vérifié → SMS → audit → plan → paiement → activation.
            </p>
          </div>
          <Link
            to="/admin/outreach-command-center"
            className="text-xs text-readable-muted hover:text-readable inline-flex items-center gap-1"
          >
            Command Center <ArrowRight className="w-3 h-3" />
          </Link>
        </header>

        {/* Pipeline */}
        <section>
          <h2 className="text-lg font-semibold text-readable mb-3">Pipeline</h2>
          {loading || !kpis ? (
            <div className="text-sm text-readable-muted">Chargement…</div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {STAGES.map((s, i) => {
                const value = kpis[s.key] ?? 0;
                const active = selectedStage === s.key;
                return (
                  <button
                    key={s.key}
                    onClick={() => setSelectedStage(active ? null : s.key)}
                    className={`shrink-0 rounded-2xl border px-4 py-3 text-left transition ${
                      active
                        ? "border-emerald-400/60 bg-emerald-500/10"
                        : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                    }`}
                    style={{ minWidth: 130 }}
                  >
                    <div className="text-[10px] uppercase tracking-widest text-readable-muted">
                      #{i + 1} · {s.label}
                    </div>
                    <div className="text-2xl font-semibold text-readable mt-1">{value}</div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Table */}
        <section>
          <h2 className="text-lg font-semibold text-readable mb-3">
            {selectedStage ? `Prospects — ${STAGES.find(s => s.key === selectedStage)?.label}` : "Sélectionnez une étape"}
          </h2>
          {selectedStage && (
            <div className="rounded-2xl border border-white/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-white/[0.03] text-readable-muted text-[11px] uppercase tracking-widest">
                  <tr>
                    <th className="text-left px-4 py-2">Entreprise</th>
                    <th className="text-left px-4 py-2">Ville</th>
                    <th className="text-left px-4 py-2">Catégorie</th>
                    <th className="text-left px-4 py-2">Téléphone</th>
                    <th className="text-left px-4 py-2">Source</th>
                    <th className="text-left px-4 py-2">Statut</th>
                    <th className="text-left px-4 py-2">Mise à jour</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-6 text-readable-muted text-center">Aucun prospect à cette étape.</td></tr>
                  )}
                  {rows.map(r => (
                    <tr key={r.id} className="border-t border-white/5">
                      <td className="px-4 py-2 text-readable">{r.business_name}</td>
                      <td className="px-4 py-2 text-readable-body">{r.city ?? "—"}</td>
                      <td className="px-4 py-2 text-readable-body">{r.category ?? "—"}</td>
                      <td className="px-4 py-2 text-readable-body">{r.phone_e164 ? `••• ${String(r.phone_e164).slice(-4)}` : "—"}</td>
                      <td className="px-4 py-2 text-readable-body">{r.source ?? "—"}</td>
                      <td className="px-4 py-2">
                          <span className="text-[11px] uppercase tracking-widest text-readable-muted">{r.outreach_status ?? "—"}</span>
                      </td>
                      <td className="px-4 py-2">
                        <span className="text-readable-muted">{r.updated_at ? new Date(r.updated_at).toLocaleDateString("fr-CA") : "—"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
