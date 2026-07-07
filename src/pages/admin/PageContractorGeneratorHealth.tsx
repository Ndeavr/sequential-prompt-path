/**
 * UNPRO — Admin cockpit: /admin/contractor-generator-health
 * Runs validator against contractor rows and surfaces the fail list + score gate.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  validatePublicPage,
  computeMonogramInitials,
  type ContractorPageInput,
} from "@/features/contractorProfile";

interface Row {
  id: string;
  business_name: string;
  slug: string | null;
  logo_url: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  service_area: string[] | null;
  service_types: string[] | null;
}

export default function PageContractorGeneratorHealth() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "failing" | "passing">("failing");

  useEffect(() => {
    supabase
      .from("contractors")
      .select("id, business_name, slug, logo_url, phone, website, description, service_area, service_types")
      .limit(200)
      .then(({ data }) => {
        setRows((data as any as Row[]) ?? []);
        setLoading(false);
      });
  }, []);

  const results = useMemo(() => {
    return rows.map((r) => {
      const input: ContractorPageInput = {
        page_type: "contractor_registry",
        language: "fr",
        contractor_id: r.id,
        slug: r.slug ?? "",
        canonical_url: r.slug ? `https://unpro.ca/pro/${r.slug}` : "",
        business_name: r.business_name ?? "Entrepreneur",
        logo: {
          url: r.logo_url,
          verified: Boolean(r.logo_url),
          monogram: { initials: computeMonogramInitials(r.business_name ?? "?"), bg: "#0F1A2E", fg: "#F5C542" },
        },
        hero: {
          tagline: "Spécialiste local",
          territories: r.service_area ?? [],
          phone: r.phone ?? "",
          website: r.website ?? undefined,
        },
        description: r.description ?? "",
        gallery: [],
        faqs: [],
        ctas: {
          book_appointment: "Planifier une évaluation (60 min.)",
          alex: "Parler à Alex",
          evaluation: "Demander une évaluation",
        },
        service_area: r.service_area ?? [],
        service_types: r.service_types ?? [],
      };
      return { row: r, result: validatePublicPage(input) };
    });
  }, [rows]);

  const filtered = results.filter((r) =>
    filter === "all" ? true : filter === "failing" ? !r.result.publishable : r.result.publishable,
  );

  const stats = {
    total: results.length,
    passing: results.filter((r) => r.result.publishable).length,
    failing: results.filter((r) => !r.result.publishable).length,
  };

  if (loading) return <div className="p-8 text-muted-foreground">Chargement…</div>;

  return (
    <div className="alex-immersive min-h-screen text-white p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-semibold tracking-[-0.03em] mb-2">Contractor Generator Health</h1>
      <p className="text-white/60 mb-6">Registry validation gate — publish requires score ≥ 90 and zero failed checks.</p>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat label="Total" value={stats.total} />
        <Stat label="Publiables" value={stats.passing} tone="ok" />
        <Stat label="Bloquées" value={stats.failing} tone="warn" />
      </div>

      <div className="flex gap-2 mb-4">
        {(["failing", "passing", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs border transition ${
              filter === f ? "bg-white text-[#050816] border-white" : "border-white/15 text-white/70 hover:bg-white/5"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.04] text-white/60 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left p-3">Entrepreneur</th>
              <th className="text-right p-3">Score</th>
              <th className="text-right p-3">V</th>
              <th className="text-right p-3">T</th>
              <th className="text-right p-3">A</th>
              <th className="text-right p-3">C</th>
              <th className="text-left p-3">Checks échoués</th>
              <th className="text-center p-3">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map(({ row, result }) => (
              <tr key={row.id} className="hover:bg-white/[0.02]">
                <td className="p-3">
                  <div className="font-medium">{row.business_name}</div>
                  <div className="text-[10px] text-white/40 font-mono">{row.slug ?? "no-slug"}</div>
                </td>
                <td className={`p-3 text-right font-bold ${result.score.total >= 90 ? "text-emerald-400" : result.score.total >= 60 ? "text-amber-400" : "text-red-400"}`}>
                  {result.score.total}
                </td>
                <td className="p-3 text-right text-white/70">{result.score.visibility}</td>
                <td className="p-3 text-right text-white/70">{result.score.trust}</td>
                <td className="p-3 text-right text-white/70">{result.score.aeo}</td>
                <td className="p-3 text-right text-white/70">{result.score.conversion}</td>
                <td className="p-3 text-[11px] text-white/60">
                  {result.failed.length === 0 ? "—" : result.failed.join(", ")}
                </td>
                <td className="p-3 text-center">
                  {result.publishable ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300">PUBLISHABLE</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300">DRAFT</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "ok" | "warn" }) {
  const color = tone === "ok" ? "text-emerald-400" : tone === "warn" ? "text-amber-400" : "text-white";
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-[10px] uppercase tracking-[0.25em] text-white/50">{label}</div>
      <div className={`text-3xl font-semibold mt-1 ${color}`}>{value}</div>
    </div>
  );
}
