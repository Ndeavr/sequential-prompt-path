/**
 * PageAdminFounderPipeline — /admin/founder-pipeline
 *
 * Founder (local services & professionals) pipeline overview:
 * filter by city / category / status, real capacity used per city,
 * activations, renewal dates and attribution. Read-only over
 * public.founder_memberships (RLS: admin only).
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Crown } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

const CITY_CAP = 10;

const STATUS_LABELS: Record<string, string> = {
  founder_eligible: "Admissible",
  founder_invited: "Invité",
  founder_landing_viewed: "Landing vue",
  founder_signup_started: "Inscription débutée",
  identity_contact_verified: "Identité vérifiée",
  founder_activated: "Activé",
  first_referral: "1re mise en relation",
  renewal_due: "Renouvellement dû",
  renewed: "Renouvelé",
  expired: "Expiré",
  waitlisted: "Liste d'attente",
};

export default function PageAdminFounderPipeline() {
  const [cityFilter, setCityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-founder-memberships"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("founder_memberships" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["founder-eligible-categories-admin"],
    queryFn: async () => {
      const { data } = await supabase
        .from("founder_eligible_categories" as any)
        .select("slug, name_fr, internal_cap_per_city");
      return (data ?? []) as any[];
    },
  });

  const catName = useMemo(() => {
    const m = new Map<string, string>();
    (categories ?? []).forEach((c) => m.set(c.slug, c.name_fr));
    return m;
  }, [categories]);

  const filtered = useMemo(() => {
    return (rows ?? []).filter(
      (r) =>
        (!cityFilter || r.city?.toLowerCase().includes(cityFilter.toLowerCase())) &&
        (!categoryFilter || r.category_slug === categoryFilter) &&
        (!statusFilter || r.status === statusFilter),
    );
  }, [rows, cityFilter, categoryFilter, statusFilter]);

  /**
   * Acquisition « 1 an gratuit » — vue serveur v_local_service_acquisition :
   * provenance, admissibilité de contact, envoi, clic, réclamation, place
   * obtenue et complétude du profil. Aucune donnée n'est recalculée ici.
   */
  const { data: acquisition } = useQuery({
    queryKey: ["admin-local-service-acquisition"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_local_service_acquisition" as any)
        .select("*")
        .order("outreach_sent_at", { ascending: false, nullsFirst: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const acquisitionFiltered = useMemo(() => {
    return (acquisition ?? []).filter(
      (r) =>
        (!cityFilter || r.city?.toLowerCase().includes(cityFilter.toLowerCase())) &&
        (!categoryFilter || r.service_category_slug === categoryFilter),
    );
  }, [acquisition, cityFilter, categoryFilter]);

  /**
   * Abandons par étape — offre gratuite. Comptage réel des événements
   * canoniques déjà journalisés, aucune estimation.
   */
  const FREE_STEPS: { event: string; label: string }[] = [
    { event: "landing_viewed", label: "Page vue" },
    { event: "registration_started", label: "Inscription débutée" },
    { event: "otp_sent", label: "Code envoyé" },
    { event: "otp_verified", label: "Courriel confirmé" },
    { event: "profile_activated", label: "Membership activé" },
  ];

  const { data: freeFunnel } = useQuery({
    queryKey: ["admin-founder-free-funnel"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_funnel_events" as any)
        .select("event_type, step")
        .in("step", ["founder_free_landing", "founder_free_signup", "founder_free_activation"])
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const freeFunnelCounts = useMemo(() => {
    const counts = new Map<string, number>();
    (freeFunnel ?? []).forEach((e) => counts.set(e.event_type, (counts.get(e.event_type) ?? 0) + 1));
    return FREE_STEPS.map((s, i) => {
      const value = counts.get(s.event) ?? 0;
      const prev = i === 0 ? value : counts.get(FREE_STEPS[i - 1].event) ?? 0;
      return { ...s, value, lost: Math.max(prev - value, 0) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freeFunnel]);

  /**
   * Cible campagne : 10 activations gratuites réelles.
   * Seules les lignes founder_memberships réellement activées comptent.
   */
  const ACTIVATED_STATUSES = ["founder_activated", "first_referral", "renewal_due", "renewed"];
  const activatedCount = useMemo(
    () => (rows ?? []).filter((r) => ACTIVATED_STATUSES.includes(r.status)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows],
  );
  const startedCount = useMemo(
    () => (rows ?? []).filter((r) => ["founder_signup_started", "founder_landing_viewed"].includes(r.status)).length,
    [rows],
  );
  const pendingConfirmation = useMemo(
    () => (rows ?? []).filter((r) => r.status === "founder_signup_started").length,
    [rows],
  );

  /** Livraison réelle par canal (30 derniers jours), aucune estimation. */
  const { data: delivery } = useQuery({
    queryKey: ["admin-founder-delivery"],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const { data, error } = await supabase
        .from("outreach_delivery_logs" as any)
        .select("channel, status, created_at")
        .gte("created_at", since)
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const deliveryStats = useMemo(() => {
    const base = { sms: { sent: 0, delivered: 0, failed: 0 }, email: { sent: 0, delivered: 0, failed: 0 } };
    (delivery ?? []).forEach((d) => {
      const ch = d.channel === "sms" ? "sms" : d.channel === "email" ? "email" : null;
      if (!ch) return;
      if (["sent", "queued", "accepted", "delivered"].includes(d.status)) base[ch].sent += 1;
      if (d.status === "delivered") base[ch].delivered += 1;
      if (["failed", "undelivered", "bounced"].includes(d.status)) base[ch].failed += 1;
    });
    return base;
  }, [delivery]);

  /** Blocage courant réel — drapeau serveur, jamais supposé. */
  const { data: outreachFlag } = useQuery({
    queryKey: ["admin-outreach-flag"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_flags" as any)
        .select("value")
        .eq("key", "OUTREACH_ENABLED")
        .maybeSingle();
      return (data as any)?.value ?? null;
    },
  });

  const outreachOn = String(outreachFlag ?? "").toLowerCase() === "true";

  /**
   * Segment « débarras / ramassage d'encombrants » — suivi séparé.
   * Chiffres réels uniquement : prospects trouvés, admissibles à l'envoi,
   * contactés, cliqués, inscrits, activés.
   */
  const JUNK_SLUG = "debarras-ramassage";
  const { data: junkSegment } = useQuery({
    queryKey: ["admin-founder-junk-segment"],
    queryFn: async () => {
      const { data: prospects } = await supabase
        .from("verified_contractor_prospects" as any)
        .select(
          "id, verification_status, data_quality_score, outreach_status, phone_source_url, website_url, google_business_url, google_place_id, email",
        )
        .eq("service_category_slug", JUNK_SLUG)
        .limit(1000);
      const list = (prospects ?? []) as any[];
      const eligible = list.filter(
        (p) =>
          p.verification_status === "verified" &&
          (p.data_quality_score ?? 0) >= 80 &&
          (p.phone_source_url || p.website_url || p.google_business_url || p.google_place_id),
      );
      const byStatus = (s: string[]) => list.filter((p) => s.includes(p.outreach_status ?? "none")).length;
      const { count: activated } = await supabase
        .from("founder_memberships" as any)
        .select("id", { count: "exact", head: true })
        .eq("category_slug", JUNK_SLUG)
        .in("status", ACTIVATED_STATUSES);
      const { count: started } = await supabase
        .from("founder_memberships" as any)
        .select("id", { count: "exact", head: true })
        .eq("category_slug", JUNK_SLUG)
        .eq("status", "founder_signup_started");
      return {
        found: list.length,
        eligible: eligible.length,
        contacted: byStatus(["sent", "delivered", "clicked", "registered", "payment_started", "paid", "activated"]),
        delivered: byStatus(["delivered", "clicked", "registered", "payment_started", "paid", "activated"]),
        clicked: byStatus(["clicked", "registered", "payment_started", "paid", "activated"]),
        started: Number(started ?? 0),
        activated: Number(activated ?? 0),
      };
    },
  });


  const capacityByCity = useMemo(() => {
    const map = new Map<string, number>();
    (rows ?? []).forEach((r) => {
      if (ACTIVATED_STATUSES.includes(r.status)) {
        map.set(r.city, (map.get(r.city) ?? 0) + 1);
      }
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);


  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <Helmet>
        <title>Pipeline Fondateurs — Admin UNPRO</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Crown className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Pipeline Fondateurs</h1>
          <p className="text-sm text-muted-foreground">
            Services résidentiels — 12 mois gratuits, puis 350 $/an.
          </p>
        </div>
      </div>

      {/* CIBLE 10 — campagne acquisition gratuite */}
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[12px] uppercase tracking-wide text-muted-foreground">Cible campagne</div>
            <div className="mt-1 text-3xl font-semibold text-foreground">
              {activatedCount}/10 <span className="text-base font-normal text-muted-foreground">activations réelles</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-card px-4 py-2.5">
              <div className="text-[12px] text-muted-foreground">Inscriptions débutées</div>
              <div className="text-lg font-semibold text-foreground">{startedCount}</div>
            </div>
            <div className="rounded-xl bg-card px-4 py-2.5">
              <div className="text-[12px] text-muted-foreground">Confirmation en attente</div>
              <div className="text-lg font-semibold text-foreground">{pendingConfirmation}</div>
            </div>
            <div className="rounded-xl bg-card px-4 py-2.5">
              <div className="text-[12px] text-muted-foreground">SMS envoyés / livrés</div>
              <div className="text-lg font-semibold text-foreground">
                {deliveryStats.sms.sent}/{deliveryStats.sms.delivered}
              </div>
            </div>
            <div className="rounded-xl bg-card px-4 py-2.5">
              <div className="text-[12px] text-muted-foreground">Courriels envoyés / livrés</div>
              <div className="text-lg font-semibold text-foreground">
                {deliveryStats.email.sent}/{deliveryStats.email.delivered}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.min(activatedCount / 10, 1) * 100}%` }}
          />
        </div>
        <p className="mt-3 text-sm">
          {activatedCount >= 10 ? (
            <span className="font-medium text-primary">Cible atteinte — l'acquisition gratuite s'arrête automatiquement.</span>
          ) : outreachOn ? (
            <span className="text-muted-foreground">Prospection active. Blocage courant : aucun.</span>
          ) : (
            <span className="font-medium text-destructive">Blocage courant : prospection désactivée (OUTREACH_ENABLED = false).</span>
          )}
        </p>
      </div>

      {/* Abandons par étape — offre gratuite */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">
          Offre gratuite — où les entreprises abandonnent
        </h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {freeFunnelCounts.map((s) => (
            <div key={s.event} className="rounded-xl bg-secondary/50 px-4 py-3">
              <div className="text-[12px] text-muted-foreground">{s.label}</div>
              <div className="mt-1 text-xl font-semibold text-foreground">{s.value}</div>
              {s.lost > 0 && (
                <div className="mt-1 text-[12px] font-medium text-destructive">
                  −{s.lost} à cette étape
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Real capacity used per city */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Capacité réelle utilisée (10 membres / ville)</h2>
        {capacityByCity.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Aucun membre activé pour le moment.</p>
        ) : (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {capacityByCity.map(([city, used]) => (
              <div key={city} className="flex items-center justify-between rounded-xl bg-secondary/50 px-4 py-2.5 text-sm">
                <span className="text-foreground">{city}</span>
                <span className="font-semibold text-primary">
                  {used}/{CITY_CAP}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          placeholder="Filtrer par ville"
          className="rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground"
        >
          <option value="">Toutes les catégories</option>
          {(categories ?? []).map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name_fr}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {/* Acquisition « 1 an gratuit » — prospects réels, du contact à l'activation */}
      <div className="rounded-2xl border border-border">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">
            Acquisition services résidentiels — 1 an gratuit
          </h2>
          <span className="text-[12px] text-muted-foreground">
            {acquisitionFiltered.length} prospect(s) · prochain contact = première ligne sans envoi
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-[12px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Entreprise</th>
                <th className="px-4 py-3">Ville</th>
                <th className="px-4 py-3">Catégorie</th>
                <th className="px-4 py-3">Provenance</th>
                <th className="px-4 py-3">Contact permis</th>
                <th className="px-4 py-3">Envoi</th>
                <th className="px-4 py-3">Landing</th>
                <th className="px-4 py-3">Réclamé</th>
                <th className="px-4 py-3">Place</th>
                <th className="px-4 py-3">Profil</th>
              </tr>
            </thead>
            <tbody>
              {acquisitionFiltered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-6 text-center text-muted-foreground">
                    Aucun prospect de services résidentiels ne correspond aux filtres.
                  </td>
                </tr>
              )}
              {acquisitionFiltered.map((r) => (
                <tr key={r.prospect_id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium text-foreground">{r.business_name}</td>
                  <td className="px-4 py-3 text-foreground">{r.city ?? "—"}</td>
                  <td className="px-4 py-3 text-foreground">
                    {catName.get(r.service_category_slug) ?? r.service_category_slug ?? "En attente"}
                    <span className="ml-1 text-[11px] text-muted-foreground">({r.service_category_source ?? "—"})</span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-muted-foreground">{r.provenance ?? "—"}</td>
                  <td className="px-4 py-3 text-[12px] text-muted-foreground">
                    {[r.sms_eligible ? "SMS" : null, r.email_eligible ? "Courriel" : null].filter(Boolean).join(" · ") || "Aucun"}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-muted-foreground">
                    {r.outreach_sent_at ? new Date(r.outreach_sent_at).toLocaleDateString("fr-CA") : "—"}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-muted-foreground">
                    {r.outreach_clicked_at ? "Vue" : "—"}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-muted-foreground">
                    {r.claimed_at ? new Date(r.claimed_at).toLocaleDateString("fr-CA") : "—"}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-foreground">
                    {r.slot_number ? `${r.slot_number}/${CITY_CAP}` : "—"}
                    {r.founder_end && (
                      <div className="text-[11px] text-muted-foreground">
                        jusqu'au {new Date(r.founder_end).toLocaleDateString("fr-CA")}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-muted-foreground">
                    {[r.onboarding_status ?? "—", r.has_service_areas ? "territoire" : null, r.has_logo ? "logo" : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-[12px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Entreprise</th>
              <th className="px-4 py-3">Ville</th>
              <th className="px-4 py-3">Catégorie</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Fin période gratuite</th>
              <th className="px-4 py-3">Renouvellement</th>
              <th className="px-4 py-3">Attribution</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  Chargement…
                </td>
              </tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  Aucun membre ne correspond aux filtres.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{r.business_name}</div>
                  <div className="text-[12px] text-muted-foreground">{r.email}</div>
                </td>
                <td className="px-4 py-3 text-foreground">{r.city}</td>
                <td className="px-4 py-3 text-foreground">{catName.get(r.category_slug) ?? r.category_slug}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[12px] font-medium text-primary">
                    {STATUS_LABELS[r.status] ?? r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {r.founder_end ? new Date(r.founder_end).toLocaleDateString("fr-CA") : "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {(r.renewal_price_cents / 100).toLocaleString("fr-CA")} $/{r.renewal_cadence === "year" ? "an" : r.renewal_cadence}
                </td>
                <td className="px-4 py-3 text-[12px] text-muted-foreground">
                  {r.attribution?.utm_campaign ?? r.attribution?.ref ?? r.source ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
