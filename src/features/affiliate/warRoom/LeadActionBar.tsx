/**
 * LeadActionBar — 1-click contact actions for a lead card.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Phone, MessageCircle, MoreHorizontal } from "lucide-react";
import { PersonalSmsSheet, type PersonalSmsLead, type PersonalSmsAffiliate } from "./PersonalSmsSheet";
import {
  buildActivationLink, buildPersonalSms, buildWhatsAppHref, buildTelHref,
} from "@/features/affiliate/messages/messageBuilder";
import { DEFAULT_VARIANT } from "@/features/affiliate/messages/variants";
import { logLeadEvent } from "./useLogLeadEvent";

interface Props {
  lead: PersonalSmsLead;
  affiliate: PersonalSmsAffiliate;
}

export function LeadActionBar({ lead, affiliate }: Props) {
  const [smsOpen, setSmsOpen] = useState(false);
  const hasPhone = !!lead.phone_e164;

  const openWhatsApp = () => {
    if (!lead.phone_e164) return;
    const link = buildActivationLink(lead.id, affiliate.referral_code ?? null);
    const affiliateFirst = affiliate.first_name ?? affiliate.name?.split(" ")[0] ?? null;
    const body = buildPersonalSms({
      leadFirstName: lead.first_name, leadFullName: lead.full_name,
      companyName: lead.company_name, city: lead.city,
      affiliateFirstName: affiliateFirst, activationLink: link,
    }, DEFAULT_VARIANT);
    logLeadEvent({
      affiliateId: affiliate.id, leadId: lead.id,
      eventType: "whatsapp_opened", channel: "whatsapp", payload: { body },
    });
    window.open(buildWhatsAppHref(lead.phone_e164, body), "_blank");
  };

  const onCall = () => {
    if (!lead.phone_e164) return;
    logLeadEvent({
      affiliateId: affiliate.id, leadId: lead.id,
      eventType: "call_initiated", channel: "voice",
    });
    window.location.href = buildTelHref(lead.phone_e164);
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <Button
          onClick={() => setSmsOpen(true)}
          disabled={!hasPhone}
          className="h-12"
          title={hasPhone ? "SMS perso" : "Numéro manquant"}
        >
          <MessageSquare className="h-4 w-4 mr-1" /> SMS perso
        </Button>
        <Button
          variant="outline"
          onClick={onCall}
          disabled={!hasPhone}
          className="h-12"
        >
          <Phone className="h-4 w-4 mr-1" /> Appeler
        </Button>
        <Button
          variant="outline"
          onClick={openWhatsApp}
          disabled={!hasPhone}
          className="h-12"
        >
          <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
        </Button>
      </div>

      <PersonalSmsSheet
        open={smsOpen}
        onOpenChange={setSmsOpen}
        lead={lead}
        affiliate={affiliate}
      />
    </>
  );
}
