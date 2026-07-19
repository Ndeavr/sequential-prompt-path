/**
 * PageAdminAffiliateNew — Créer un affilié / partenaire / ambassadeur.
 * Route: /admin/affiliates/new
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, UserPlus, Send, Eye } from "lucide-react";

const AFF_TYPES = [
  { v: "affiliate", l: "Affilié" },
  { v: "partner", l: "Partenaire (entreprise)" },
  { v: "ambassador", l: "Ambassadeur" },
  { v: "admin_affiliate", l: "Admin affilié" },
];

const DEFAULT_PERMS = {
  affiliate: { can_add_leads: true, can_import_leads: true, can_view_assigned_leads: true, can_send_personal_sms: true, can_send_unpro_sms: true, can_call_leads: true, can_view_commissions: true, can_view_revenue: true, can_manage_team: false, can_edit_public_page: true, can_export_data: true },
  partner:   { can_add_leads: true, can_import_leads: true, can_view_assigned_leads: true, can_send_personal_sms: true, can_send_unpro_sms: true, can_call_leads: true, can_view_commissions: true, can_view_revenue: true, can_manage_team: true,  can_edit_public_page: true, can_export_data: true },
  ambassador:{ can_add_leads: true, can_import_leads: false,can_view_assigned_leads: true, can_send_personal_sms: true, can_send_unpro_sms: false,can_call_leads: false,can_view_commissions: true, can_view_revenue: false,can_manage_team: false, can_edit_public_page: false,can_export_data: false },
  admin_affiliate: { can_add_leads: true, can_import_leads: true, can_view_assigned_leads: true, can_send_personal_sms: true, can_send_unpro_sms: true, can_call_leads: true, can_view_commissions: true, can_view_revenue: true, can_manage_team: true, can_edit_public_page: true, can_export_data: true },
} as const;

function slugify(s: string) {
  return s.toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function PageAdminAffiliateNew() {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    first_name: "", last_name: "", business_name: "",
    email: "", phone: "", primary_city: "", province: "QC",
    preferred_language: "fr", affiliate_type: "affiliate",
    slug: "", commission_pct: 10, daily_quota: 10, bio: "",
    territories: "", allowed_categories: "",
    display_preference: "first_name",
    status: "draft" as "draft" | "invited" | "active",
  });

  const set = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(mode: "create" | "invite" | "open") {
    if (!form.first_name && !form.business_name) return toast.error("Prénom ou entreprise requis");
    if (!form.email && !form.phone) return toast.error("Courriel ou téléphone requis");

    setBusy(true);
    try {
      const slug = (form.slug.trim() || slugify(`${form.first_name} ${form.last_name || ""}`.trim()) || slugify(form.business_name)).slice(0, 40);
      const refCode = `${slug.toUpperCase().replace(/-/g, "").slice(0, 12)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      const perms = (DEFAULT_PERMS as any)[form.affiliate_type] ?? DEFAULT_PERMS.affiliate;
      const status = mode === "invite" ? "invited" : mode === "open" ? "active" : form.status;

      const payload: any = {
        name: `${form.first_name} ${form.last_name}`.trim() || form.business_name,
        first_name: form.first_name || null,
        last_name: form.last_name || null,
        business_name: form.business_name || null,
        email: form.email?.toLowerCase() || null,
        phone: form.phone || null,
        primary_city: form.primary_city || null,
        province: form.province || "QC",
        preferred_language: form.preferred_language || "fr",
        affiliate_type: form.affiliate_type,
        slug,
        referral_code: refCode,
        commission_pct: Number(form.commission_pct) || 0,
        daily_quota: Number(form.daily_quota) || 10,
        bio: form.bio || null,
        display_preference: form.display_preference,
        status,
        permissions: perms,
        territories: form.territories ? form.territories.split(",").map((s) => s.trim()).filter(Boolean) : null,
        allowed_categories: form.allowed_categories ? form.allowed_categories.split(",").map((s) => s.trim()).filter(Boolean) : null,
        activated_at: status === "active" ? new Date().toISOString() : null,
        invited_at: status === "invited" ? new Date().toISOString() : null,
      };

      const { data, error } = await (supabase as any).from("affiliates").insert(payload).select("id, slug").single();
      if (error) throw error;

      toast.success(`Affilié créé : /a/${data.slug}`);

      if (mode === "invite") {
        // Best-effort: log invitation intent (real send hook TBD)
        const shortUrl = `${window.location.origin}/go/${data.slug}`;
        await (supabase as any).from("affiliate_invitations").insert({
          affiliate_id: data.id,
          channel: form.email && form.phone ? "both" : form.email ? "email" : "sms",
          sent_to: form.email || form.phone,
          short_url: shortUrl,
          status: "queued",
        });
        toast.info("Invitation en file d'attente");
      }

      if (mode === "open") {
        window.open(`/a/${data.slug}`, "_blank");
      }
      nav(`/admin/affiliates`, { replace: true });
    } catch (e: any) {
      toast.error(e.message || "Création impossible");
    } finally { setBusy(false); }
  }

  return (
    <div className="admin-theme min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-3xl p-6 space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">Nouvel affilié</h1>
          <p className="text-sm text-white/60 mt-1">Créer un profil, générer le slug et lien court, envoyer l'invitation.</p>
        </header>

        <Card className="bg-white/[0.03] border-white/10">
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Prénom</Label><Input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} /></div>
              <div><Label>Nom</Label><Input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} /></div>
            </div>
            <div><Label>Entreprise (facultatif)</Label><Input value={form.business_name} onChange={(e) => set("business_name", e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Courriel</Label><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
              <div><Label>Téléphone mobile</Label><Input inputMode="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Ville</Label><Input value={form.primary_city} onChange={(e) => set("primary_city", e.target.value)} /></div>
              <div><Label>Province</Label><Input value={form.province} onChange={(e) => set("province", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Langue</Label>
                <Select value={form.preferred_language} onValueChange={(v) => set("preferred_language", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="fr">Français</SelectItem><SelectItem value="en">English</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.affiliate_type} onValueChange={(v) => set("affiliate_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{AFF_TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Slug personnalisé (facultatif)</Label><Input placeholder="ex: lorraine" value={form.slug} onChange={(e) => set("slug", e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Territoires (séparés par virgule)</Label><Input value={form.territories} onChange={(e) => set("territories", e.target.value)} /></div>
              <div><Label>Catégories (séparées par virgule)</Label><Input value={form.allowed_categories} onChange={(e) => set("allowed_categories", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Commission %</Label><Input type="number" value={form.commission_pct} onChange={(e) => set("commission_pct", e.target.value)} /></div>
              <div><Label>Quota quotidien</Label><Input type="number" value={form.daily_quota} onChange={(e) => set("daily_quota", e.target.value)} /></div>
            </div>
            <div><Label>Bio publique</Label><Textarea rows={2} value={form.bio} onChange={(e) => set("bio", e.target.value)} /></div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => submit("invite")} disabled={busy} className="gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Créer et inviter
          </Button>
          <Button variant="secondary" onClick={() => submit("create")} disabled={busy} className="gap-2">
            <UserPlus className="h-4 w-4" /> Créer sans envoyer
          </Button>
          <Button variant="outline" onClick={() => submit("open")} disabled={busy} className="gap-2">
            <Eye className="h-4 w-4" /> Créer et ouvrir la page
          </Button>
          <Button variant="ghost" onClick={() => nav("/admin/affiliates")}>Annuler</Button>
        </div>
      </div>
    </div>
  );
}
