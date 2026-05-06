/**
 * UNPRO — Partner CRM
 * Pipeline, KPIs, consent-gated messaging, reminders.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Users, ShieldAlert, ShieldCheck, Bell, ArrowLeft } from "lucide-react";
import { usePartner } from "./usePartner";
import { usePartnerLeads, usePartnerTasks, useCreateLead, useCompleteTask } from "@/hooks/usePartnerCrm";
import { hasValidConsent } from "@/lib/leadConsent";
import { PartnerKanban } from "@/components/partner/PartnerKanban";
import { LeadDetailDrawer } from "@/components/partner/LeadDetailDrawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function PartnerCrm() {
  const { partner, loading } = usePartner();
  const { data: leads = [] } = usePartnerLeads();
  const { data: tasksToday = [] } = usePartnerTasks("today");
  const { data: tasksLate = [] } = usePartnerTasks("late");
  const completeTask = useCompleteTask();
  const createLead = useCreateLead();
  const [openId, setOpenId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState({ business_name: "", contact_name: "", email: "", phone: "", city: "", trade: "" });

  const stats = useMemo(() => {
    const total = leads.length;
    const permReq = leads.filter((l: any) => !hasValidConsent(l) && l.consent_status !== "do_not_contact").length;
    const authorized = leads.filter((l: any) => hasValidConsent(l)).length;
    const demos = leads.filter((l: any) => l.lead_status === "demo_scheduled").length;
    const conversions = leads.filter((l: any) => l.lead_status === "active").length;
    return { total, permReq, authorized, demos, conversions };
  }, [leads]);

  const submitNew = async () => {
    if (!form.business_name && !form.contact_name) return toast.error("Nom requis");
    try {
      await createLead.mutateAsync({ ...form, lead_status: "new_prospect", consent_status: "permission_required", source: "manual" });
      toast.success("Prospect créé");
      setNewOpen(false);
      setForm({ business_name: "", contact_name: "", email: "", phone: "", city: "", trade: "" });
    } catch (e: any) { toast.error(e.message); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#060B14] text-white/60">Chargement…</div>;
  if (!partner) return <div className="min-h-screen flex items-center justify-center bg-[#060B14] text-white/60">Aucun profil partenaire.</div>;

  return (
    <div className="min-h-screen bg-[#060B14] text-white">
      <header className="border-b border-white/10 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/partenaire/dashboard" className="text-white/50 hover:text-white"><ArrowLeft className="h-4 w-4" /></Link>
          <div>
            <p className="text-xs text-amber-400">CRM Partenaire</p>
            <h1 className="text-lg sm:text-xl font-semibold">Pipeline de vente</h1>
          </div>
        </div>
        <Button size="sm" onClick={() => setNewOpen(true)} className="bg-amber-500 text-black hover:bg-amber-400">
          <Plus className="h-3 w-3 mr-1" /> Nouveau prospect
        </Button>
      </header>

      <main className="px-4 sm:px-6 py-5 space-y-5 max-w-7xl mx-auto">
        {/* Conformity banner */}
        <div className="text-xs bg-amber-500/5 border border-amber-500/20 rounded p-3 text-amber-200">
          Vous devez obtenir la permission du client avant d'envoyer un message. UNPRO conserve l'historique
          de consentement afin de protéger les partenaires, les entrepreneurs et la plateforme.
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Kpi label="Leads" value={stats.total} icon={<Users className="h-4 w-4" />} />
          <Kpi label="Permission requise" value={stats.permReq} icon={<ShieldAlert className="h-4 w-4 text-red-300" />} />
          <Kpi label="Contacts autorisés" value={stats.authorized} icon={<ShieldCheck className="h-4 w-4 text-emerald-300" />} />
          <Kpi label="Démos" value={stats.demos} icon={<Bell className="h-4 w-4 text-amber-300" />} />
          <Kpi label="Conversions" value={stats.conversions} icon={<Users className="h-4 w-4 text-emerald-300" />} />
        </div>

        {/* Reminders today + late */}
        {(tasksToday.length > 0 || tasksLate.length > 0) && (
          <section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-2"><Bell className="h-4 w-4" /> Rappels</h2>
              <span className="text-xs text-white/50">{tasksLate.length} en retard · {tasksToday.length} aujourd'hui</span>
            </div>
            <div className="space-y-2">
              {[...tasksLate.map((t:any)=>({...t,_late:true})), ...tasksToday].slice(0, 6).map((t: any) => (
                <div key={t.id} className={`flex items-center justify-between text-xs rounded border p-2 ${t._late ? "border-red-500/30 bg-red-500/5" : "border-white/10 bg-white/5"}`}>
                  <div className="min-w-0">
                    <div className="text-white truncate">{t.title}</div>
                    <div className="text-white/50">{new Date(t.due_at).toLocaleString("fr-CA")} · {t.partner_leads?.business_name ?? "—"}</div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {t.lead_id && <Button size="sm" variant="outline" onClick={() => setOpenId(t.lead_id)} className="h-6 text-[11px] border-white/20 text-white hover:bg-white/5">Ouvrir</Button>}
                    <Button size="sm" onClick={() => completeTask.mutate(t.id)} className="h-6 text-[11px] bg-emerald-500 text-black hover:bg-emerald-400">Terminé</Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Pipeline */}
        <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <h2 className="text-sm font-semibold mb-3">Pipeline</h2>
          {leads.length === 0 ? (
            <div className="text-center py-12 text-white/50 text-sm">
              Aucun prospect. <button onClick={() => setNewOpen(true)} className="text-amber-400 underline">Créez votre premier prospect</button>.
            </div>
          ) : (
            <PartnerKanban leads={leads} onOpen={setOpenId} />
          )}
        </section>
      </main>

      <LeadDetailDrawer leadId={openId} open={!!openId} onOpenChange={(o) => !o && setOpenId(null)} />

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="bg-[#0B1220] border-white/10 text-white">
          <DialogHeader><DialogTitle>Nouveau prospect</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-[11px] bg-amber-500/5 border border-amber-500/20 rounded p-2 text-amber-200">
              Statut par défaut : <strong>Permission requise</strong>. Aucun envoi ne sera possible avant d'obtenir la permission.
            </div>
            {([
              ["business_name","Entreprise"],
              ["contact_name","Contact"],
              ["email","Courriel"],
              ["phone","Téléphone"],
              ["city","Ville"],
              ["trade","Métier"],
            ] as const).map(([k, l]) => (
              <div key={k}>
                <Label>{l}</Label>
                <Input value={(form as any)[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} className="bg-white/5 border-white/10 text-white" />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setNewOpen(false)} className="border-white/20 text-white hover:bg-white/5">Annuler</Button>
            <Button onClick={submitNew} disabled={createLead.isPending} className="bg-amber-500 text-black hover:bg-amber-400">Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center gap-2 text-[11px] text-white/60 mb-1">{icon} {label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
