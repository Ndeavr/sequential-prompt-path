/**
 * UNPRO — Admin: Partner Approvals
 * Approve / suspend partners. Approval grants the 'partner' role.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, Pause, RefreshCw } from "lucide-react";

interface PartnerRow {
  id: string; user_id: string | null; email: string;
  first_name: string | null; last_name: string | null; company: string | null;
  partner_status: string; partner_tier: string; referral_code: string | null;
  created_at: string;
}

export default function AdminPartenaires() {
  const [rows, setRows] = useState<PartnerRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("partners" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as any) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (p: PartnerRow) => {
    if (!p.user_id) return toast.error("Aucun user_id sur ce partenaire");
    const { error: rErr } = await supabase
      .from("user_roles" as any)
      .insert({ user_id: p.user_id, role: "partner" } as any);
    // Ignore unique violation if already has role
    if (rErr && !String(rErr.message).includes("duplicate")) {
      return toast.error(rErr.message);
    }
    const { error } = await supabase
      .from("partners" as any)
      .update({ partner_status: "approved", approved_at: new Date().toISOString() } as any)
      .eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success(`${p.email} approuvé`);
    load();
  };

  const suspend = async (p: PartnerRow) => {
    const { error } = await supabase
      .from("partners" as any)
      .update({ partner_status: "suspended" } as any)
      .eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success(`${p.email} suspendu`);
    load();
  };

  return (
    <div className="min-h-screen bg-[#060B14] text-white">
      <header className="border-b border-white/10 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold">Partenaires Certifiés</h1>
        <Button variant="outline" size="sm" onClick={load} className="border-white/20 text-white hover:bg-white/5">
          <RefreshCw className="h-3 w-3 mr-1" /> Actualiser
        </Button>
      </header>
      <main className="p-6">
        {loading ? (
          <div className="text-white/60">Chargement…</div>
        ) : rows.length === 0 ? (
          <div className="text-white/60">Aucun partenaire.</div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-white/50">
                <tr>
                  <th className="text-left p-3">Partenaire</th>
                  <th className="text-left p-3">Courriel</th>
                  <th className="text-left p-3">Entreprise</th>
                  <th className="text-left p-3">Code</th>
                  <th className="text-left p-3">Statut</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-t border-white/5">
                    <td className="p-3">{[p.first_name, p.last_name].filter(Boolean).join(" ") || "—"}</td>
                    <td className="p-3 text-white/70">{p.email}</td>
                    <td className="p-3 text-white/70">{p.company || "—"}</td>
                    <td className="p-3 font-mono text-[11px] text-amber-400">{p.referral_code || "—"}</td>
                    <td className="p-3">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border ${
                        p.partner_status === "approved" ? "bg-green-500/10 text-green-400 border-green-500/20"
                        : p.partner_status === "suspended" ? "bg-red-500/10 text-red-400 border-red-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      }`}>{p.partner_status}</span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      {p.partner_status !== "approved" && (
                        <Button size="sm" onClick={() => approve(p)} className="bg-green-500 text-black hover:bg-green-400">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Approuver
                        </Button>
                      )}
                      {p.partner_status === "approved" && (
                        <Button size="sm" variant="outline" onClick={() => suspend(p)} className="border-white/20 text-white hover:bg-white/5">
                          <Pause className="h-3 w-3 mr-1" /> Suspendre
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
