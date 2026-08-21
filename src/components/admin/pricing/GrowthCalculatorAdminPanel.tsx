/**
 * UNPRO — Admin: Growth Calculator controls
 * Settings (profile fee, annual discount, caps), territory overrides with manual
 * validation, abandoned calculations, and the pricing audit trail.
 * Every write is logged automatically by the DB audit trigger.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { formatPriceCents } from "@/lib/formatPrice";

interface Settings {
  id: string;
  profile_fee_cents: number;
  annual_months_charged: number;
  guaranteed_appointments_cap: number;
  entry_pack_total_cents: number;
  entry_pack_duration_months: number;
  default_close_rate: number;
}

interface Override {
  id: string;
  service_slug: string;
  city_slug: string;
  price_multiplier: number;
  min_monthly_cents: number | null;
  max_guaranteed_appointments: number | null;
  manually_validated: boolean;
  active: boolean;
}

const inputCls =
  "w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/30";

export default function GrowthCalculatorAdminPanel() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [abandoned, setAbandoned] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    service_slug: "",
    city_slug: "",
    price_multiplier: 1,
    min_monthly_cents: 0,
    max_guaranteed_appointments: 0,
  });

  const load = async () => {
    setLoading(true);
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const [s, o, a, l] = await Promise.all([
      supabase
        .from("pricing_growth_settings" as any)
        .select("*")
        .eq("active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("pricing_territory_overrides" as any)
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(200),
      supabase
        .from("contractor_pricing_quotes" as any)
        .select("id, company_name, trade_primary, city, recommended_plan, recommended_monthly_price, pricing_status, source, created_at")
        .eq("source", "growth_calculator")
        .in("pricing_status", ["draft", "offered"])
        .lt("created_at", since)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("pricing_audit_log" as any)
        .select("id, event_type, reason, created_at, new_state")
        .in("event_type", [
          "pricing_growth_settings_insert",
          "pricing_growth_settings_update",
          "pricing_territory_overrides_insert",
          "pricing_territory_overrides_update",
          "pricing_territory_overrides_delete",
        ])
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    setSettings((s.data as any) ?? null);
    setOverrides(((o.data as any[]) ?? []) as Override[]);
    setAbandoned((a.data as any[]) ?? []);
    setAudit((l.data as any[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase
      .from("pricing_growth_settings" as any)
      .update({
        profile_fee_cents: Math.round(settings.profile_fee_cents),
        annual_months_charged: Number(settings.annual_months_charged),
        guaranteed_appointments_cap: Math.round(settings.guaranteed_appointments_cap),
        entry_pack_total_cents: Math.round(settings.entry_pack_total_cents),
        entry_pack_duration_months: Math.round(settings.entry_pack_duration_months),
        default_close_rate: Number(settings.default_close_rate),
      })
      .eq("id", settings.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Réglages enregistrés");
      load();
    }
  };

  const addOverride = async () => {
    if (!draft.service_slug || !draft.city_slug) {
      toast.error("Domaine et ville requis");
      return;
    }
    const { error } = await supabase.from("pricing_territory_overrides" as any).upsert(
      {
        service_slug: draft.service_slug.trim().toLowerCase(),
        city_slug: draft.city_slug.trim().toLowerCase(),
        price_multiplier: Number(draft.price_multiplier) || 1,
        min_monthly_cents: draft.min_monthly_cents || null,
        max_guaranteed_appointments: draft.max_guaranteed_appointments || null,
      },
      { onConflict: "service_slug,city_slug" },
    );
    if (error) toast.error(error.message);
    else {
      toast.success("Territoire enregistré");
      setDraft({ service_slug: "", city_slug: "", price_multiplier: 1, min_monthly_cents: 0, max_guaranteed_appointments: 0 });
      load();
    }
  };

  const toggleValidated = async (row: Override) => {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("pricing_territory_overrides" as any)
      .update({
        manually_validated: !row.manually_validated,
        validated_by: !row.manually_validated ? u.user?.id ?? null : null,
        validated_at: !row.manually_validated ? new Date().toISOString() : null,
      })
      .eq("id", row.id);
    if (error) toast.error(error.message);
    else load();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-white/70">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement des réglages tarifaires…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Settings */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60">
          Calculateur de forfait — réglages
        </h2>
        {settings ? (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <label className="text-xs text-white/60">
                Frais de profil (cents)
                <input
                  className={inputCls}
                  type="number"
                  value={settings.profile_fee_cents}
                  onChange={(e) =>
                    setSettings({ ...settings, profile_fee_cents: Number(e.target.value) })
                  }
                />
              </label>
              <label className="text-xs text-white/60">
                Mois facturés à l'année
                <input
                  className={inputCls}
                  type="number"
                  step="0.5"
                  value={settings.annual_months_charged}
                  onChange={(e) =>
                    setSettings({ ...settings, annual_months_charged: Number(e.target.value) })
                  }
                />
              </label>
              <label className="text-xs text-white/60">
                Plafond RDV garantis
                <input
                  className={inputCls}
                  type="number"
                  value={settings.guaranteed_appointments_cap}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      guaranteed_appointments_cap: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="text-xs text-white/60">
                Pack d'entrée (cents)
                <input
                  className={inputCls}
                  type="number"
                  value={settings.entry_pack_total_cents}
                  onChange={(e) =>
                    setSettings({ ...settings, entry_pack_total_cents: Number(e.target.value) })
                  }
                />
              </label>
              <label className="text-xs text-white/60">
                Durée du pack (mois)
                <input
                  className={inputCls}
                  type="number"
                  value={settings.entry_pack_duration_months}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      entry_pack_duration_months: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="text-xs text-white/60">
                Taux de conversion par défaut
                <input
                  className={inputCls}
                  type="number"
                  step="0.01"
                  value={settings.default_close_rate}
                  onChange={(e) =>
                    setSettings({ ...settings, default_close_rate: Number(e.target.value) })
                  }
                />
              </label>
            </div>
            <button
              onClick={saveSettings}
              disabled={saving}
              className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </>
        ) : (
          <p className="mt-3 text-sm text-white/60">Aucun réglage actif.</p>
        )}
      </section>

      {/* Territory overrides */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60">
          Prix par domaine et territoire
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          <input
            className={inputCls}
            placeholder="domaine (slug)"
            value={draft.service_slug}
            onChange={(e) => setDraft({ ...draft, service_slug: e.target.value })}
          />
          <input
            className={inputCls}
            placeholder="ville (slug)"
            value={draft.city_slug}
            onChange={(e) => setDraft({ ...draft, city_slug: e.target.value })}
          />
          <input
            className={inputCls}
            type="number"
            step="0.05"
            placeholder="multiplicateur"
            value={draft.price_multiplier}
            onChange={(e) => setDraft({ ...draft, price_multiplier: Number(e.target.value) })}
          />
          <input
            className={inputCls}
            type="number"
            placeholder="prix plancher (cents)"
            value={draft.min_monthly_cents || ""}
            onChange={(e) => setDraft({ ...draft, min_monthly_cents: Number(e.target.value) })}
          />
          <input
            className={inputCls}
            type="number"
            placeholder="RDV max"
            value={draft.max_guaranteed_appointments || ""}
            onChange={(e) =>
              setDraft({ ...draft, max_guaranteed_appointments: Number(e.target.value) })
            }
          />
        </div>
        <button
          onClick={addOverride}
          className="mt-3 rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white"
        >
          Ajouter / mettre à jour
        </button>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-white/50">
              <tr>
                <th className="py-2 text-left">Domaine</th>
                <th className="text-left">Ville</th>
                <th className="text-left">×</th>
                <th className="text-left">Plancher</th>
                <th className="text-left">RDV max</th>
                <th className="text-left">Validé</th>
              </tr>
            </thead>
            <tbody>
              {overrides.map((o) => (
                <tr key={o.id} className="border-t border-white/5">
                  <td className="py-2">{o.service_slug}</td>
                  <td>{o.city_slug}</td>
                  <td>{Number(o.price_multiplier).toFixed(2)}</td>
                  <td>{o.min_monthly_cents ? formatPriceCents(o.min_monthly_cents) : "—"}</td>
                  <td>{o.max_guaranteed_appointments ?? "—"}</td>
                  <td>
                    <button
                      onClick={() => toggleValidated(o)}
                      className={`rounded-full px-2 py-0.5 ${
                        o.manually_validated
                          ? "bg-emerald-500/20 text-emerald-200"
                          : "bg-white/10 text-white/60"
                      }`}
                    >
                      {o.manually_validated ? "validé" : "à valider"}
                    </button>
                  </td>
                </tr>
              ))}
              {!overrides.length && (
                <tr>
                  <td colSpan={6} className="py-3 text-white/50">
                    Aucun territoire configuré.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Abandoned */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60">
          Calculs abandonnés (plus de 24 h sans paiement)
        </h2>
        <div className="mt-3 space-y-2">
          {abandoned.map((q) => (
            <div key={q.id} className="flex justify-between border-b border-white/5 py-2 text-xs">
              <span className="text-white/80">
                {q.company_name || "Sans nom"} · {q.trade_primary} · {q.city}
              </span>
              <span className="text-white/50">
                {q.recommended_plan} · {formatPriceCents(Number(q.recommended_monthly_price ?? 0))}
              </span>
            </div>
          ))}
          {!abandoned.length && <p className="text-xs text-white/50">Aucun calcul abandonné.</p>}
        </div>
      </section>

      {/* Audit */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60">
          Journal d'audit tarifaire
        </h2>
        <div className="mt-3 space-y-2">
          {audit.map((a) => (
            <div key={a.id} className="flex justify-between border-b border-white/5 py-2 text-xs">
              <span className="text-white/80">{a.event_type}</span>
              <span className="text-white/50">
                {new Date(a.created_at).toLocaleString("fr-CA")}
              </span>
            </div>
          ))}
          {!audit.length && <p className="text-xs text-white/50">Aucune modification enregistrée.</p>}
        </div>
      </section>
    </div>
  );
}
