/**
 * PersonalSmsSheet — 1-click personal SMS composer.
 *
 * Flow:
 *  1. Show 3 variants, editable body, char counter, link check.
 *  2. On "Ouvrir SMS" → log `personal_sms_opened`, navigate to `sms:` deep link.
 *  3. On return → user MUST confirm (Envoyé / Non envoyé / Modifier).
 *     Only then is `personal_sms_sent_at` set and `contact_status = personal_sms_sent`.
 *  4. Desktop: show QR code of the sms: link + Copy number/message.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MessageSquare, Copy, Send, CheckCircle2, XCircle, Pencil, Phone } from "lucide-react";
import { SMS_VARIANTS, DEFAULT_VARIANT, type SmsVariantKey } from "@/features/affiliate/messages/variants";
import {
  buildPersonalSms, buildActivationLink, buildSmsHref, buildTelHref,
} from "@/features/affiliate/messages/messageBuilder";
import { logLeadEvent } from "./useLogLeadEvent";
import { supabase } from "@/integrations/supabase/client";
import { formatPhoneDisplay } from "@/features/affiliate/lib/phoneUtils";

export interface PersonalSmsLead {
  id: string;
  first_name?: string | null;
  full_name?: string | null;
  company_name?: string | null;
  city?: string | null;
  phone_e164?: string | null;
}

export interface PersonalSmsAffiliate {
  id: string;
  first_name?: string | null;
  name?: string | null;
  referral_code?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lead: PersonalSmsLead;
  affiliate: PersonalSmsAffiliate;
}

type Stage = "compose" | "awaiting_confirmation";

export function PersonalSmsSheet({ open, onOpenChange, lead, affiliate }: Props) {
  const [variant, setVariant] = useState<SmsVariantKey>(DEFAULT_VARIANT);
  const [body, setBody] = useState("");
  const [stage, setStage] = useState<Stage>("compose");
  const [busy, setBusy] = useState(false);

  const affiliateFirst = affiliate.first_name ?? affiliate.name?.split(" ")[0] ?? null;

  const activationLink = useMemo(
    () => buildActivationLink(lead.id, affiliate.referral_code ?? null),
    [lead.id, affiliate.referral_code]
  );

  useEffect(() => {
    if (!open) return;
    setStage("compose");
    setBody(buildPersonalSms(
      {
        leadFirstName: lead.first_name,
        leadFullName: lead.full_name,
        companyName: lead.company_name,
        city: lead.city,
        affiliateFirstName: affiliateFirst,
        activationLink,
      },
      variant
    ));
  }, [open, variant, lead, affiliateFirst, activationLink]);

  const smsHref = lead.phone_e164 ? buildSmsHref(lead.phone_e164, body) : null;
  const telHref = lead.phone_e164 ? buildTelHref(lead.phone_e164) : null;
  const linkOk = body.includes(activationLink);
  const charCount = body.length;

  const handleOpenSms = async () => {
    if (!smsHref || !lead.phone_e164) return;
    setBusy(true);
    try {
      await logLeadEvent({
        affiliateId: affiliate.id,
        leadId: lead.id,
        eventType: "personal_sms_opened",
        channel: "sms",
        payload: { variant, body, activation_link: activationLink, phone_e164: lead.phone_e164 },
      });
      await (supabase as any)
        .from("contractor_leads")
        .update({ personal_sms_opened_at: new Date().toISOString() })
        .eq("id", lead.id);
    } finally {
      setBusy(false);
    }
    window.location.href = smsHref;
    setStage("awaiting_confirmation");
  };

  const confirmSent = async () => {
    setBusy(true);
    try {
      await (supabase as any)
        .from("contractor_leads")
        .update({
          contact_status: "personal_sms_sent",
          last_contacted_by: affiliate.id,
          last_contacted_at: new Date().toISOString(),
          personal_sms_sent_at: new Date().toISOString(),
          next_follow_up_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        })
        .eq("id", lead.id);
      await logLeadEvent({
        affiliateId: affiliate.id, leadId: lead.id,
        eventType: "personal_sms_confirmed_sent",
        payload: { variant, body },
      });
      toast.success("SMS marqué comme envoyé");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const confirmNotSent = async () => {
    await logLeadEvent({
      affiliateId: affiliate.id, leadId: lead.id,
      eventType: "personal_sms_not_sent",
      payload: { variant },
    });
    toast("Aucun statut mis à jour");
    onOpenChange(false);
  };

  const copy = async (what: "number" | "message") => {
    const v = what === "number" ? (lead.phone_e164 ?? "") : body;
    try {
      await navigator.clipboard.writeText(v);
      toast.success(what === "number" ? "Numéro copié" : "Message copié");
      await logLeadEvent({
        affiliateId: affiliate.id, leadId: lead.id,
        eventType: what === "number" ? "number_copied" : "message_copied",
      });
    } catch { toast.error("Copie impossible"); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" /> SMS perso
          </SheetTitle>
          <SheetDescription>
            {lead.company_name ?? "Prospect"}
            {lead.phone_e164 ? ` · ${formatPhoneDisplay(lead.phone_e164)}` : " · numéro manquant"}
          </SheetDescription>
        </SheetHeader>

        {!lead.phone_e164 ? (
          <div className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
            Numéro invalide ou manquant. Ajoutez un numéro valide avant d'envoyer.
          </div>
        ) : stage === "compose" ? (
          <div className="space-y-4 mt-4">
            <div className="flex gap-2 flex-wrap">
              {SMS_VARIANTS.map((v) => (
                <Button
                  key={v.key}
                  size="sm"
                  variant={variant === v.key ? "default" : "outline"}
                  onClick={() => setVariant(v.key)}
                >
                  {v.label}
                </Button>
              ))}
            </div>

            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={7}
              className="text-sm"
            />

            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{charCount} caractères</span>
              {linkOk ? (
                <Badge variant="outline" className="text-emerald-500 border-emerald-500/40">Lien présent</Badge>
              ) : (
                <Badge variant="destructive">Lien manquant</Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleOpenSms} disabled={busy || !linkOk} className="h-14 col-span-2">
                <Send className="h-4 w-4 mr-2" /> Ouvrir SMS sur mon téléphone
              </Button>
              <Button variant="outline" onClick={() => copy("number")}>
                <Copy className="h-4 w-4 mr-2" /> Copier numéro
              </Button>
              <Button variant="outline" onClick={() => copy("message")}>
                <Copy className="h-4 w-4 mr-2" /> Copier message
              </Button>
              {telHref && (
                <Button asChild variant="ghost" className="col-span-2">
                  <a href={telHref}>
                    <Phone className="h-4 w-4 mr-2" /> Appeler à la place
                  </a>
                </Button>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground text-center">
              Sur mobile, l'application SMS s'ouvre avec le numéro et le message pré-remplis. Le statut ne changera qu'après votre confirmation.
            </p>
          </div>
        ) : (
          <div className="space-y-4 mt-6 text-center">
            <p className="text-sm text-foreground font-medium">Application SMS ouverte.</p>
            <p className="text-xs text-muted-foreground">Confirmez après l'envoi.</p>
            <div className="grid grid-cols-1 gap-2">
              <Button onClick={confirmSent} disabled={busy} className="h-14">
                <CheckCircle2 className="h-4 w-4 mr-2" /> Envoyé
              </Button>
              <Button variant="outline" onClick={confirmNotSent} disabled={busy}>
                <XCircle className="h-4 w-4 mr-2" /> Non envoyé
              </Button>
              <Button variant="ghost" onClick={() => setStage("compose")} disabled={busy}>
                <Pencil className="h-4 w-4 mr-2" /> Modifier le message
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
