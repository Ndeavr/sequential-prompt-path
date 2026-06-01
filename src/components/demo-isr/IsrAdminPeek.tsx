import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Row {
  id: string;
  created_at: string;
  promo_valid: boolean;
  recommended_plan: string | null;
  payment_status: string;
  flow_status: string;
  stripe_session_id: string | null;
}

export default function IsrAdminPeek() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", auth.user.id);
      const admin = (roles ?? []).some((r: { role: string }) => r.role === "admin");
      setIsAdmin(admin);
      if (admin) {
        const { data } = await supabase
          .from("demo_contractor_plan_tests")
          .select("id,created_at,promo_valid,recommended_plan,payment_status,flow_status,stripe_session_id")
          .order("created_at", { ascending: false })
          .limit(10);
        setRows((data ?? []) as Row[]);
      }
    })();
  }, []);

  if (!isAdmin) return null;

  return (
    <div className="mt-10 rounded-[22px] border border-white/10 bg-white/[0.02] p-5 text-white/80">
      <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-300/70 mb-3">Admin · 10 dernières démos ISR</div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-white/40">
            <tr>
              <th className="text-left py-2 pr-3">Date</th>
              <th className="text-left py-2 pr-3">Promo</th>
              <th className="text-left py-2 pr-3">Plan</th>
              <th className="text-left py-2 pr-3">Paiement</th>
              <th className="text-left py-2 pr-3">Flow</th>
              <th className="text-left py-2 pr-3">Session</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} className="py-3 text-white/40">Aucune démo enregistrée pour l'instant.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-white/5">
                <td className="py-2 pr-3 whitespace-nowrap">{new Date(r.created_at).toLocaleString("fr-CA")}</td>
                <td className="py-2 pr-3">{r.promo_valid ? "Oui" : "Non"}</td>
                <td className="py-2 pr-3">{r.recommended_plan ?? "—"}</td>
                <td className="py-2 pr-3">{r.payment_status}</td>
                <td className="py-2 pr-3">{r.flow_status}</td>
                <td className="py-2 pr-3 font-mono">{r.stripe_session_id?.slice(0, 14) ?? "—"}…</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
