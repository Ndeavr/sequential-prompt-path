import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { EmailInput } from "@/components/ui/email-input";
import { cleanTextField } from "@/utils/cleanInput";
import { Bell, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  service: string;
  city: string;
  onSubmit: (data: { firstName: string; phone: string; email?: string; followUpConsent: boolean }) => void;
  isLoading?: boolean;
}

export default function CardJoinWaitlist({ service, city, onSubmit, isLoading }: Props) {
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = cleanTextField(firstName);
    if (!cleanName || !(phone.trim() || email.trim()) || !consent) return;
    onSubmit({ firstName: cleanName, phone: phone.trim(), email: email.trim() || undefined, followUpConsent: consent });
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Demander un suivi</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Avec votre accord, votre projet en <strong>{service}</strong> à <strong>{city}</strong> peut être conservé. Aucun délai ni rendez-vous n’est garanti.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <Label htmlFor="wl-name" className="text-xs">Prénom</Label>
          <Input id="wl-name" value={firstName} onChange={e => setFirstName(e.target.value)} onBlur={() => setFirstName(cleanTextField(firstName))} placeholder="Votre prénom" required />
        </div>
        <div>
          <Label htmlFor="wl-phone" className="text-xs">Téléphone</Label>
          <PhoneInput id="wl-phone" value={phone} onChange={setPhone} placeholder="(514) 555-0000" />
        </div>
        <div>
          <Label htmlFor="wl-email" className="text-xs">Courriel — ou téléphone ci-dessus</Label>
          <EmailInput id="wl-email" value={email} onChange={setEmail} placeholder="nom@exemple.com" />
        </div>
        <div className="flex items-start gap-3">
          <Checkbox id="wl-consent" checked={consent} onCheckedChange={v => setConsent(v === true)} />
          <Label htmlFor="wl-consent" className="text-sm leading-relaxed">J’accepte que ma demande soit conservée et d’être contacté pour le suivi de ce projet.</Label>
        </div>
        <Button type="submit" className="w-full" disabled={isLoading || !cleanTextField(firstName) || !(phone.trim() || email.trim()) || !consent}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Conserver ma demande
        </Button>
      </form>
    </div>
  );
}
