/**
 * Ajout rapide d'un prospect en Mode Action : nom + téléphone seulement.
 * Réutilise la logique existante (dédoublonnage + insertion contractor_leads).
 */
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { checkDuplicate, insertLead, phoneDigitsCount } from "@/features/affiliate/addLead/useAddLead";
import { formatPhoneDisplay } from "@/features/affiliate/lib/phoneUtils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  affiliateId: string;
  onCreated: () => void;
}

export default function AddProspectSheet({ open, onOpenChange, affiliateId, onCreated }: Props) {
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [saving, setSaving] = useState(false);

  const phoneOk = phoneDigitsCount(phone) === 10 || phoneDigitsCount(phone) === 11;
  const canSave = company.trim().length >= 2 && phoneOk && !saving;

  async function save() {
    setSaving(true);
    try {
      const draft = { company_name: company.trim(), phone, city: city.trim() || undefined, source_label: "affiliate_action_mode" };
      const dup = await checkDuplicate(draft).catch(() => ({ match: null }));
      if (dup?.match) {
        toast.error("Ce prospect existe déjà", { description: dup.match.company_name ?? "Déjà dans votre liste." });
        setSaving(false);
        return;
      }
      await insertLead(draft, affiliateId);
      toast.success("Prospect ajouté");
      setCompany("");
      setPhone("");
      setCity("");
      onOpenChange(false);
      onCreated();
    } catch (e: any) {
      toast.error("Ajout impossible", { description: e?.message ?? "Réessayez." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>Ajouter un prospect</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="ap-company">Nom de l'entreprise</Label>
            <Input id="ap-company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Excavation Tremblay" className="h-14 text-base" autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ap-phone">Téléphone</Label>
            <Input
              id="ap-phone"
              inputMode="tel"
              value={formatPhoneDisplay(phone)}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(514) 555-0199"
              className="h-14 text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ap-city">Ville (optionnel)</Label>
            <Input id="ap-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Laval" className="h-14 text-base" />
          </div>
          <Button onClick={save} disabled={!canSave} className="w-full h-14 text-base font-semibold rounded-2xl">
            {saving ? "Enregistrement…" : "Ajouter et appeler"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
