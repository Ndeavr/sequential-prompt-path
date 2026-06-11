/**
 * /admin/founders — Mission 48H war room dashboard.
 */
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface Row {
  id: string;
  company: string;
  trade: string | null;
  city: string | null;
  email: string;
  score_visibility: number | null;
  score_growth: number | null;
  status: string;
  stripe_session_id: string | null;
  paid_at: string | null;
  created_at: string;
}

const TARGETS = {
  analyses: 25,
  activations: 10,
  checkouts: 5,
  paid: 1,
};

export default function PageAdminFounders() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data, error } = await supabase
        .from("founder_score_prospects" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (!mounted) return;
      if (!error) setRows((data as unknown as Row[]) ?? []);
      setLoading(false);
    };
    load();

    const ch = supabase
      .channel("founder_prospects_admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "founder_score_prospects" },
        load,
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, []);

  const counts = rows.reduce(
    (acc, r) => {
      acc.analyses += 1;
      if (["started", "activated", "checkout_started", "paid", "live"].includes(r.status))
        acc.activations += 1;
      if (["checkout_started", "paid", "live"].includes(r.status)) acc.checkouts += 1;
      if (["paid", "live"].includes(r.status) || r.paid_at) acc.paid += 1;
      return acc;
    },
    { analyses: 0, activations: 0, checkouts: 0, paid: 0 },
  );

  return (
    <>
      <Helmet>
        <title>Founders — Mission 48H</title>
      </Helmet>
      <div className="admin-theme min-h-screen p-4 md:p-6" style={{ background: "#050816", color: "#fff" }}>
        <div className="max-w-7xl mx-auto">
          <h1 className="text-[24px] font-extrabold mb-1" style={{ letterSpacing: "-0.02em" }}>
            Mission 48H — War Room
          </h1>
          <p className="text-[13px] opacity-70 mb-6">
            Premier entrepreneur payant UNPRO. Une métrique. Une mission.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {([
              ["Analyses IA", counts.analyses, TARGETS.analyses],
              ["Activations", counts.activations, TARGETS.activations],
              ["Checkouts", counts.checkouts, TARGETS.checkouts],
              ["Payés", counts.paid, TARGETS.paid],
            ] as const).map(([label, value, target]) => {
              const pct = Math.min(100, (value / target) * 100);
              return (
                <div
                  key={label}
                  className="rounded-2xl p-4 border"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    borderColor: "rgba(255,255,255,0.12)",
                  }}
                >
                  <div className="text-[11px] uppercase tracking-wider opacity-60">{label}</div>
                  <div className="text-[28px] font-extrabold mt-1">
                    {value}
                    <span className="text-[14px] font-medium opacity-50"> / {target}</span>
                  </div>
                  <div className="h-1.5 mt-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background:
                          value >= target ? "#10B981" : "linear-gradient(90deg, #F5C85A, #D4AF37)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div
            className="rounded-2xl border overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.03)",
              borderColor: "rgba(255,255,255,0.1)",
            }}
          >
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-10 text-center opacity-60 flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={18} /> Chargement…
                </div>
              ) : rows.length === 0 ? (
                <div className="p-10 text-center opacity-60">Aucun prospect pour le moment.</div>
              ) : (
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="text-left opacity-60 uppercase text-[10px] tracking-wider">
                      <th className="px-4 py-2">Entreprise</th>
                      <th className="px-4 py-2">Métier</th>
                      <th className="px-4 py-2">Ville</th>
                      <th className="px-4 py-2">Score</th>
                      <th className="px-4 py-2">Statut</th>
                      <th className="px-4 py-2">Plan</th>
                      <th className="px-4 py-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                        <td className="px-4 py-2.5 font-semibold">{r.company}</td>
                        <td className="px-4 py-2.5 opacity-80">{r.trade ?? "—"}</td>
                        <td className="px-4 py-2.5 opacity-80">{r.city ?? "—"}</td>
                        <td className="px-4 py-2.5 font-mono">
                          {r.score_visibility ?? "—"} / {r.score_growth ?? "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className="px-2 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider"
                            style={{
                              background:
                                r.status === "paid" || r.paid_at
                                  ? "rgba(16,185,129,0.18)"
                                  : r.status === "checkout_started"
                                    ? "rgba(245,200,90,0.18)"
                                    : "rgba(255,255,255,0.08)",
                              color:
                                r.status === "paid" || r.paid_at
                                  ? "#10B981"
                                  : r.status === "checkout_started"
                                    ? "#F5C85A"
                                    : "rgba(255,255,255,0.7)",
                            }}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 opacity-80">Fondateur 149$/mo</td>
                        <td className="px-4 py-2.5 opacity-60">
                          {new Date(r.created_at).toLocaleString("fr-CA")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
