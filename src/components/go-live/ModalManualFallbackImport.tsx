import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";
import { WebsiteInput } from "@/components/ui/website-input";
import { AlertTriangle, Building2 } from "lucide-react";
import { cleanTextField } from "@/utils/cleanInput";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { business_name: string; city: string; phone: string; website: string }) => void;
}

export default function ModalManualFallbackImport({ open, onClose, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ business_name: cleanTextField(name), city: cleanTextField(city), phone: phone.trim(), website: website.trim() });
    setName(""); setCity(""); setPhone(""); setWebsite("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Import manuel
          </DialogTitle>
          <DialogDescription>
            Entrez les informations manuellement si la recherche Google ne trouve pas l'entreprise.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <p className="text-xs text-amber-200/80">
              L'import manuel ne bénéficiera pas de l'enrichissement automatique Google.
            </p>
          </div>

          <div>
            <Label className="text-sm font-semibold">Nom d'entreprise *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setName(cleanTextField(name))} placeholder="Ex: Toitures Dupont" className="h-10 mt-1" required />
          </div>
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Ville</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} onBlur={() => setCity(cleanTextField(city))} placeholder="Ex: Montréal" className="h-10 mt-1" />
          </div>
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Téléphone</Label>
            <PhoneInput value={phone} onChange={setPhone} placeholder="(514) 555-1234" className="h-10 mt-1" />
          </div>
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Site web</Label>
            <WebsiteInput value={website} onChange={setWebsite} placeholder="www.exemple.ca" className="h-10 mt-1" />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={!name.trim()}>Importer manuellement</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
