/**
 * UNPRO — Partner Dashboard
 * KPIs, referrals table, quick actions.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePartner } from "./usePartner";
import { Button } from "@/components/ui/button";
import { Plus, Wrench, Wallet, TrendingUp, Users, Target, LayoutGrid } from "lucide-react";

interface Referral {
  id: string;
  business_name: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  plan: string | null;
  monthly_revenue: number;
  activated_at: string | null;
  created_at: string;
}

interface Commission {
  amount: number;
  payout_status: string;
  earned_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  submitted: "Soumis", contacted: "Contacté", onboarding: "Onboarding",
  payment_pending: "Paiement en attente", active: "Actif", rejected: "Refusé",
  churn: "Churn", suspended: "Suspendu",
};

export default function PartnerDashboard() {
  const { partner, loading } = usePartner();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);

  useEffect(() => {
    if (!partner?.id) return;
    (async () => {
      const [{ data: refs }, { data: com }] = await Promise.all([
        supabase.from("partner_referrals" as any).select("*").eq("partner_id", partner.id).order("created_at", { ascending: false }),
        supabase.from("partner_commissions" as any).select("amount,payout_status,earned_at").eq("partner_id", partner.id),
      ]);
      setReferrals((refs as any) ?? []);
      setCommissions((com as any) ?? []);
    })();
  }, [partner?.id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#060B14] text-white/60">Chargement…</div>;
  if (!partner) return <div className="min-h-screen flex items-center justify-center bg-[#060B14] text-white/60">Aucun profil partenaire trouvé.</div>;

  const now = new Date();
  const thisMonth = commissions.filter((c) => new Date(c.earned_at).getMonth() === now.getMonth() && new Date(c.earned_at).getFullYear() === now.getFullYear());
  const earnedMonth = thisMonth.reduce((s, c) => s + Number(c.amount || 0), 0);
  const pending = commissions.filter((c) => c.payout_status === "pending").reduce((s, c) => s + Number(c.amount || 0), 0);
  const activeContractors = referrals.filter((r) => r.status === "active").length;
  const newThisYear = referrals.filter((r) => new Date(r.created_at).getFullYear() === now.getFullYear()).length;
  const target = partner.annual_new_contractors_target || 10;
  const progress = Math.min(100, Math.round((newThisYear / target) * 100));
  const conversionRate = referrals.length ? Math.round((activeContractors / referrals.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#060B14] text-white">
      <header className="border-b border-white/10 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-amber-400">Partenaire Certifié</p>
          <h1 className="text-lg sm:text-xl font-semibold">Bonjour {partner.first_name || partner.email}</h1>
        </div>
        <span className="text-[11px] px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
          {partner.partner_status === "approved" ? "Actif" : partner.partner_status}
        </span>
      </header>

      <main className="px-4 sm:px-6 py-6 space-y-6 max-w-6xl mx-auto">
        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard icon={<Wallet className="h-4 w-4" />} label="Revenus ce mois" value={`${earnedMonth.toFixed(0)} $`} />
          <KpiCard icon={<TrendingUp className="h-4 w-4" />} label="En attente" value={`${pending.toFixed(0)} $`} />
          <KpiCard icon={<Users className="h-4 w-4" />} label="Entrepreneurs actifs" value={activeContractors.toString()} />
          <KpiCard icon={<Target className="h-4 w-4" />} label={`Objectif ${target}/an`} value={`${newThisYear}/${target}`} sub={`${progress}%`} />
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-white/60">Progression annuelle</span>
            <span className="text-amber-400">{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-500 to-amber-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link to="/partenaire/crm"><Button className="bg-amber-500 text-black hover:bg-amber-400"><LayoutGrid className="h-4 w-4 mr-1" /> CRM Pipeline</Button></Link>
          <Link to="/partenaire/nouveau-entrepreneur"><Button variant="outline" className="border-white/20 text-white hover:bg-white/5"><Plus className="h-4 w-4 mr-1" /> Ajouter un entrepreneur</Button></Link>
          <Link to="/partenaire/commissions"><Button variant="outline" className="border-white/20 text-white hover:bg-white/5"><Wallet className="h-4 w-4 mr-1" /> Commissions</Button></Link>
          <Link to="/partenaire/outils"><Button variant="outline" className="border-white/20 text-white hover:bg-white/5"><Wrench className="h-4 w-4 mr-1" /> Outils</Button></Link>
        </div>

        {/* Referrals */}
        <section className="rounded-xl border border-white/10 bg-white/5">
          <header className="px-4 py-3 border-b border-white/10 flex justify-between">
            <h2 className="text-sm font-semibold">Mes entrepreneurs ({referrals.length})</h2>
            <span className="text-xs text-white/50">Conversion {conversionRate}%</span>
          </header>
          {referrals.length === 0 ? (
            <div className="p-6 text-center text-sm text-white/50">Aucun entrepreneur encore. Soumettez votre premier référé.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-white/50">
                  <tr><th className="text-left p-3">Entreprise</th><th className="text-left p-3">Contact</th><th className="text-left p-3">Statut</th><th className="text-left p-3">Plan</th><th className="text-right p-3">$/mois</th></tr>
                </thead>
                <tbody>
                  {referrals.map((r) => (
                    <tr key={r.id} className="border-t border-white/5">
                      <td className="p-3">{r.business_name || "—"}</td>
                      <td className="p-3 text-white/70">{r.contact_name || r.email || "—"}</td>
                      <td className="p-3"><span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10">{STATUS_LABELS[r.status] || r.status}</span></td>
                      <td className="p-3 text-white/70">{r.plan || "—"}</td>
                      <td className="p-3 text-right">{Number(r.monthly_revenue || 0).toFixed(0)} $</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function KpiCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-4">
      <div className="flex items-center gap-2 text-xs text-white/60 mb-2">{icon} {label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {sub && <div className="text-[11px] text-amber-400 mt-1">{sub}</div>}
    </div>
  );
}
