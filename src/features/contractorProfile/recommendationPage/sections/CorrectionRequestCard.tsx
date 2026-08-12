/**
 * CorrectionRequestCard — « Corriger / compléter » ce profil.
 * Insère un signalement dans contractor_profile_corrections (public, statut pending).
 */
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Props {
  contractorId: string;
  contractorSlug: string;
  businessName: string;
}

const FIELDS = [
  { key: "business_name", label: "Nom de l'entreprise" },
  { key: "specialty", label: "Catégorie / spécialité" },
  { key: "services", label: "Services offerts" },
  { key: "service_areas", label: "Territoires desservis" },
  { key: "phone", label: "Téléphone" },
  { key: "website", label: "Site web" },
  { key: "address", label: "Adresse" },
  { key: "rbq", label: "Licence RBQ / accréditations" },
  { key: "other", label: "Autre information" },
];

const schema = z.object({
  field_key: z.string().min(1, "Choisissez l'information à corriger"),
  requested_value: z.string().trim().min(2, "Décrivez la correction").max(2000),
  evidence_url: z.string().trim().url("Lien invalide").max(500).optional().or(z.literal("")),
  reporter_name: z.string().trim().min(2, "Votre nom est requis").max(120),
  reporter_contact: z.string().trim().min(5, "Courriel ou téléphone requis").max(160),
});

export default function CorrectionRequestCard({
  contractorId,
  contractorSlug,
  businessName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    field_key: "",
    requested_value: "",
    evidence_url: "",
    reporter_name: "",
    reporter_contact: "",
  });

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("contractor_profile_corrections").insert({
      contractor_id: contractorId,
      contractor_slug: contractorSlug,
      field_key: parsed.data.field_key,
      requested_value: parsed.data.requested_value,
      evidence_url: parsed.data.evidence_url || null,
      reporter_name: parsed.data.reporter_name,
      reporter_contact: parsed.data.reporter_contact,
      status: "pending",
    });
    setSaving(false);
    if (error) {
      toast.error("Envoi impossible pour le moment. Réessayez dans un instant.");
      return;
    }
    toast.success("Merci. Votre demande de correction a été transmise.");
    setOpen(false);
    setForm({
      field_key: "",
      requested_value: "",
      evidence_url: "",
      reporter_name: "",
      reporter_contact: "",
    });
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <h2 className="text-lg font-semibold text-foreground">Une information est inexacte ?</h2>
      <p className="text-sm text-muted-foreground">
        Ce profil est construit à partir de sources publiques. {businessName} ou toute personne
        constatant une erreur peut demander une correction.
      </p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full sm:w-auto">
            Corriger / compléter ce profil
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Demande de correction</DialogTitle>
            <DialogDescription>
              Chaque demande est révisée par l'équipe UNPRO avant publication.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Information à corriger</Label>
              <Select value={form.field_key} onValueChange={set("field_key")}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir" />
                </SelectTrigger>
                <SelectContent>
                  {FIELDS.map((f) => (
                    <SelectItem key={f.key} value={f.key}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="corr-value">Correction demandée</Label>
              <Textarea
                id="corr-value"
                rows={4}
                maxLength={2000}
                value={form.requested_value}
                onChange={(e) => set("requested_value")(e.target.value)}
                placeholder="Indiquez l'information exacte."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="corr-proof">Lien de preuve (optionnel)</Label>
              <Input
                id="corr-proof"
                inputMode="url"
                maxLength={500}
                value={form.evidence_url}
                onChange={(e) => set("evidence_url")(e.target.value)}
                placeholder="https://"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="corr-name">Votre nom</Label>
                <Input
                  id="corr-name"
                  maxLength={120}
                  value={form.reporter_name}
                  onChange={(e) => set("reporter_name")(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="corr-contact">Courriel ou téléphone</Label>
                <Input
                  id="corr-contact"
                  maxLength={160}
                  value={form.reporter_contact}
                  onChange={(e) => set("reporter_contact")(e.target.value)}
                />
              </div>
            </div>

            <Button onClick={submit} disabled={saving} className="w-full">
              {saving ? "Envoi en cours…" : "Envoyer la demande"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
