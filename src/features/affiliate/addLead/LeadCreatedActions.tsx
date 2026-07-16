/**
 * LeadCreatedActions — post-creation actions.
 */
import { Button } from "@/components/ui/button";
import { MessageSquare, Phone, Plus } from "lucide-react";

interface Props {
  leadId: string;
  companyName: string;
  phoneE164: string | null;
  contactName: string | null;
  onAddAnother: () => void;
  onDone: () => void;
}

function buildSms(company: string, contact: string | null) {
  const name = contact ? `${contact} chez ${company}` : company;
  return `Bonjour ${name}, ici Lorraine chez UNPRO. J'ai une question rapide pour vous — auriez-vous 2 minutes ?`;
}

export function LeadCreatedActions({ leadId, companyName, phoneE164, contactName, onAddAnother, onDone }: Props) {
  const tel = phoneE164 ? `tel:${phoneE164}` : null;
  const sms = phoneE164 ? `sms:${phoneE164}?body=${encodeURIComponent(buildSms(companyName, contactName))}` : null;

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-center">
        <p className="text-sm font-medium text-emerald-500">✓ Prospect ajouté</p>
        <p className="text-xs text-muted-foreground mt-1">{companyName}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button asChild disabled={!sms} className="h-14">
          <a href={sms ?? "#"} aria-disabled={!sms}>
            <MessageSquare className="h-4 w-4 mr-2" /> SMS perso
          </a>
        </Button>
        <Button asChild variant="outline" disabled={!tel} className="h-14">
          <a href={tel ?? "#"} aria-disabled={!tel}>
            <Phone className="h-4 w-4 mr-2" /> Appeler
          </a>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="ghost" onClick={onAddAnother}>
          <Plus className="h-4 w-4 mr-2" /> Autre prospect
        </Button>
        <Button variant="ghost" onClick={onDone}>Fermer</Button>
      </div>
    </div>
  );
}
