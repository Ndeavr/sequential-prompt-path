import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Save } from "lucide-react";
import BadgeUsageSoumission from "./BadgeUsageSoumission";

interface Props {
  properties?: Array<{ id: string; name: string }>;
  onSubmit?: (data: {
    property_id: string;
    quote_title: string;
    quote_description: string;
    quote_amount: string;
    quote_date: string;
    quote_status: string;
    contractor_name: string;
    file: File | null;
  }) => void;
  isPending?: boolean;
  onCancel?: () => void;
}

export default function FormSoumissionDossierClient({ properties = [], onSubmit, isPending, onCancel }: Props) {
  const [form, setForm] = useState({
    property_id: "",
    quote_title: "",
    quote_description: "",
    quote_amount: "",
    quote_date: "",
    quote_status: "draft",
    contractor_name: "",
  });
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.({ ...form, file });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-foreground">Soumission du dossier client</h3>
        <BadgeUsageSoumission type="record" />
      </div>

      <div className="space-y-2">
        <Label>Propriété *</Label>
        <Select value={form.property_id} onValueChange={(v) => setForm((f) => ({ ...f, property_id: v }))}>
          <SelectTrigger><SelectValue placeholder="Sélectionner une propriété" /></SelectTrigger>
          <SelectContent>
            {properties.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Titre *</Label>
        <Input
          value={form.quote_title}
          onChange={(e) => setForm((f) => ({ ...f, quote_title: e.target.value }))}
          placeholder="Ex: Rénovation cuisine — Plomberie ABC"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Entrepreneur</Label>
        <Input
          value={form.contractor_name}
          onChange={(e) => setForm((f) => ({ ...f, contractor_name: e.target.value }))}
          placeholder="Nom de l'entrepreneur"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Montant ($)</Label>
          <Input
            type="number"
            step="0.01"
            value={form.quote_amount}
            onChange={(e) => setForm((f) => ({ ...f, quote_amount: e.target.value }))}
            placeholder="15 000"
          />
        </div>
        <div className="space-y-2">
          <Label>Date</Label>
          <Input
            type="date"
            value={form.quote_date}
            onChange={(e) => setForm((f) => ({ ...f, quote_date: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={form.quote_description}
          onChange={(e) => setForm((f) => ({ ...f, quote_description: e.target.value }))}
          placeholder="Détails des travaux, matériaux, conditions…"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Statut</Label>
        <Select value={form.quote_status} onValueChange={(v) => setForm((f) => ({ ...f, quote_status: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Brouillon</SelectItem>
            <SelectItem value="submitted">Soumise</SelectItem>
            <SelectItem value="accepted">Acceptée</SelectItem>
            <SelectItem value="rejected">Refusée</SelectItem>
            <SelectItem value="expired">Expirée</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Document (PDF, image)</Label>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("record-file-input")?.click()}>
            <Upload className="h-4 w-4 mr-1" /> Choisir un fichier
          </Button>
          <span className="text-sm text-muted-foreground truncate">{file?.name || "Aucun fichier"}</span>
        </div>
        <input id="record-file-input" type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending || !form.property_id || !form.quote_title} className="gap-2">
          <Save className="h-4 w-4" />
          {isPending ? "Enregistrement…" : "Enregistrer la soumission"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
        )}
      </div>
    </form>
  );
}
