/**
 * UNPRO — Partner: New Contractor Submission
 */
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePartner } from "./usePartner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function PartnerNouveauEntrepreneur() {
  const { partner } = usePartner();
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    business_name: "", contact_name: "", phone: "", email: "",
    website: "", rbq: "", city: "", trade: "", notes: "",
  });

  const onChange = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partner?.id) return toast.error("Profil partenaire introuvable");
    setLoading(true);
    const { data, error } = await supabase.from("partner_referrals" as any).insert({
      partner_id: partner.id,
      ...form,
      status: "submitted",
    } as any).select("id").maybeSingle();
    if (error) { setLoading(false); return toast.error(error.message); }

    await supabase.from("partner_events" as any).insert({
      partner_id: partner.id,
      event_type: "referral_submitted",
      metadata: { referral_id: (data as any)?.id, business_name: form.business_name },
    } as any);

    setLoading(false);
    toast.success("Entrepreneur soumis. Notre équipe va le contacter.");
    nav("/partenaire/dashboard");
  };

  return (
    <div className="min-h-screen bg-[#060B14] text-white">
      <header className="border-b border-white/10 px-4 sm:px-6 py-4">
        <Link to="/partenaire/dashboard" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Retour au tableau de bord
        </Link>
        <h1 className="text-xl font-semibold mt-2">Soumettre un entrepreneur</h1>
      </header>
      <main className="max-w-xl mx-auto px-4 py-6">
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
          <div><Label>Nom de l'entreprise *</Label><Input required value={form.business_name} onChange={(e) => onChange("business_name", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nom du contact</Label><Input value={form.contact_name} onChange={(e) => onChange("contact_name", e.target.value)} /></div>
            <div><Label>Téléphone</Label><Input type="tel" value={form.phone} onChange={(e) => onChange("phone", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Courriel</Label><Input type="email" value={form.email} onChange={(e) => onChange("email", e.target.value)} /></div>
            <div><Label>Site web</Label><Input type="url" value={form.website} onChange={(e) => onChange("website", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>RBQ</Label><Input value={form.rbq} onChange={(e) => onChange("rbq", e.target.value)} /></div>
            <div><Label>Ville</Label><Input value={form.city} onChange={(e) => onChange("city", e.target.value)} /></div>
          </div>
          <div><Label>Métier</Label><Input value={form.trade} onChange={(e) => onChange("trade", e.target.value)} placeholder="Ex: Plomberie, Toiture, Rénovation" /></div>
          <div><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => onChange("notes", e.target.value)} /></div>
          <Button disabled={loading} className="w-full bg-amber-500 text-black hover:bg-amber-400">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Soumettre"}
          </Button>
        </form>
      </main>
    </div>
  );
}
