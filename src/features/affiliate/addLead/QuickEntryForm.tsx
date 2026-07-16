/**
 * QuickEntryForm — minimal manual entry.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPhoneDisplay } from "../lib/phoneUtils";
import type { DraftLead } from "./useAddLead";

const CONSENT_CHANNELS = [
  { v: "business_card", l: "Carte d'affaires reçue" },
  { v: "in_person", l: "Rencontre en personne" },
  { v: "referral", l: "Recommandation" },
  { v: "public_website", l: "Site Web public" },
  { v: "public_directory", l: "Répertoire public" },
  { v: "event", l: "Événement" },
  { v: "existing_client", l: "Client existant" },
  { v: "other", l: "Autre" },
];

interface Props {
  initial?: DraftLead;
  onSubmit: (draft: DraftLead) => void;
  submitting?: boolean;
}

export function QuickEntryForm({ initial, onSubmit, submitting }: Props) {
  const [draft, setDraft] = useState<DraftLead>(initial ?? {});
  const set = <K extends keyof DraftLead>(k: K, v: DraftLead[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const canSubmit = !!(draft.company_name?.trim() || draft.phone?.trim());

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => { e.preventDefault(); if (canSubmit) onSubmit(draft); }}
    >
      <div>
        <Label>Nom de l'entreprise</Label>
        <Input value={draft.company_name ?? ""} onChange={(e) => set("company_name", e.target.value)} placeholder="Ex. Toitures ABC" autoFocus />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Prénom du contact</Label>
          <Input value={draft.contact_first_name ?? ""} onChange={(e) => set("contact_first_name", e.target.value)} />
        </div>
        <div>
          <Label>Nom</Label>
          <Input value={draft.contact_last_name ?? ""} onChange={(e) => set("contact_last_name", e.target.value)} />
        </div>
      </div>

      <div>
        <Label>Téléphone</Label>
        <Input
          inputMode="tel"
          value={draft.phone ?? ""}
          onChange={(e) => set("phone", e.target.value)}
          onBlur={(e) => set("phone", formatPhoneDisplay(e.target.value))}
          placeholder="(514) 555-1234"
        />
      </div>

      <div>
        <Label>Courriel</Label>
        <Input type="email" inputMode="email" value={draft.email ?? ""} onChange={(e) => set("email", e.target.value)} />
      </div>

      <div>
        <Label>Site Web</Label>
        <Input inputMode="url" value={draft.website_url ?? ""} onChange={(e) => set("website_url", e.target.value)} placeholder="entreprise.ca" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Ville</Label>
          <Input value={draft.city ?? ""} onChange={(e) => set("city", e.target.value)} />
        </div>
        <div>
          <Label>Catégorie</Label>
          <Input value={draft.category_primary ?? ""} onChange={(e) => set("category_primary", e.target.value)} placeholder="Toiture, plomberie…" />
        </div>
      </div>

      <div>
        <Label>Comment avez-vous obtenu ce contact ?</Label>
        <Select value={draft.consent_channel ?? ""} onValueChange={(v) => set("consent_channel", v)}>
          <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
          <SelectContent>
            {CONSENT_CHANNELS.map((c) => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>A-t-il accepté d'être contacté ?</Label>
        <Select value={draft.consent_to_contact ?? "unknown"} onValueChange={(v) => set("consent_to_contact", v as any)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="yes">Oui</SelectItem>
            <SelectItem value="no">Non</SelectItem>
            <SelectItem value="unknown">Inconnu</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Note personnelle</Label>
        <Textarea rows={2} value={draft.note ?? ""} onChange={(e) => set("note", e.target.value)} />
      </div>

      <Button type="submit" className="w-full h-12 text-base" disabled={!canSubmit || submitting}>
        {submitting ? "Enregistrement…" : "Enregistrer le prospect"}
      </Button>
    </form>
  );
}
