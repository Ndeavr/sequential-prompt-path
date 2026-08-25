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

  const capacityByCity = useMemo(() => {
    const map = new Map<string, number>();
    (rows ?? []).forEach((r) => {
      if (["founder_activated", "first_referral", "renewal_due", "renewed"].includes(r.status)) {
        map.set(r.city, (map.get(r.city) ?? 0) + 1);
      }
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
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
            Services locaux & professionnels — 12 mois gratuits, puis 350 $/an.
          </p>
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
