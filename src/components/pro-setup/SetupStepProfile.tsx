/**
 * Setup Step 1: Basic contractor profile info
 */
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const PROVINCES = ["QC", "ON", "BC", "AB", "MB", "SK", "NS", "NB", "NL", "PE", "NT", "YT", "NU"];

interface Props {
  profile: any;
  onSave: (data: any) => Promise<void>;
  saving: boolean;
}

export default function SetupStepProfile({ profile, onSave, saving }: Props) {
  const [form, setForm] = useState({
    business_name: profile?.business_name || "",
    specialty: profile?.specialty || "",
    description: profile?.description || "",
    phone: profile?.phone || "",
    email: profile?.email || "",
    website: profile?.website || "",
    city: profile?.city || "",
    province: profile?.province || "QC",
    postal_code: profile?.postal_code || "",
    license_number: profile?.license_number || "",
    insurance_info: profile?.insurance_info || "",
    years_experience: profile?.years_experience || undefined,
  });

  const update = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Building2 className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-display font-bold text-foreground">Votre entreprise</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Commencez par les informations essentielles. Vous pourrez enrichir votre profil ensuite.
        </p>
      </div>

      <div className="rounded-3xl border border-border/50 bg-card/60 backdrop-blur p-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label className="text-xs text-muted-foreground mb-1.5 block">Nom de l'entreprise *</Label>
            <Input value={form.business_name} onChange={e => update("business_name", e.target.value)} placeholder="Ex: Toitures Montréal Inc." className="bg-background/50" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs text-muted-foreground mb-1.5 block">Spécialité principale *</Label>
            <Input value={form.specialty} onChange={e => update("specialty", e.target.value)} placeholder="Ex: Toiture, Plomberie, Rénovation" className="bg-background/50" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs text-muted-foreground mb-1.5 block">Description</Label>
            <Textarea value={form.description} onChange={e => update("description", e.target.value)} placeholder="Décrivez votre entreprise en quelques phrases…" rows={3} className="bg-background/50 resize-none" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Téléphone</Label>
            <Input value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="514-555-0000" className="bg-background/50" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Courriel professionnel</Label>
            <Input value={form.email} onChange={e => update("email", e.target.value)} type="email" placeholder="info@votreentreprise.ca" className="bg-background/50" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Site web</Label>
            <Input value={form.website} onChange={e => update("website", e.target.value)} placeholder="https://…" className="bg-background/50" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Années d'expérience</Label>
            <Input value={form.years_experience ?? ""} onChange={e => update("years_experience", e.target.value ? Number(e.target.value) : undefined)} type="number" min={0} placeholder="10" className="bg-background/50" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Ville</Label>
            <Input value={form.city} onChange={e => update("city", e.target.value)} placeholder="Montréal" className="bg-background/50" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Province</Label>
            <Select value={form.province} onValueChange={v => update("province", v)}>
              <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
              <SelectContent>{PROVINCES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">N° licence RBQ</Label>
            <Input value={form.license_number} onChange={e => update("license_number", e.target.value)} placeholder="1234-5678-01" className="bg-background/50" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Info assurance</Label>
            <Input value={form.insurance_info} onChange={e => update("insurance_info", e.target.value)} placeholder="Responsabilité civile 2M$" className="bg-background/50" />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => onSave(form)} disabled={saving || !form.business_name} className="rounded-2xl px-6 gap-2 shadow-[var(--shadow-glow)]">
          {saving ? "Enregistrement…" : "Continuer"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
