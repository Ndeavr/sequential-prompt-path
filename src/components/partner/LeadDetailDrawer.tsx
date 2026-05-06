import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Phone, Mail, MessageSquare, Calendar, FileText, ShieldCheck, Ban, Archive, ArrowRightCircle, AlertCircle } from "lucide-react";
import { usePartnerLead, useLeadActivities, useUpdateLead, useLogActivity } from "@/hooks/usePartnerCrm";
import { hasValidConsent, LEAD_STATUS_PIPELINE } from "@/lib/leadConsent";
import { ConsentBadge } from "./ConsentBadge";
import { LeadOriginBadge } from "./LeadOriginBadge";
import { RecordConsentModal } from "./RecordConsentModal";
import { ReminderModal } from "./ReminderModal";
import { toast } from "sonner";

export function LeadDetailDrawer({ leadId, open, onOpenChange }: { leadId: string | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: lead } = usePartnerLead(leadId ?? undefined);
  const { data: activities } = useLeadActivities(leadId ?? undefined);
  const updateLead = useUpdateLead();
  const logAct = useLogActivity();
  const [consentOpen, setConsentOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [note, setNote] = useState("");

  if (!lead) return null;
  const canMessage = hasValidConsent(lead);

  const setStatus = async (s: string) => {
    await updateLead.mutateAsync({ id: lead.id, patch: { lead_status: s } });
    toast.success("Statut mis à jour");
  };
  const addNote = async () => {
    if (!note.trim()) return;
    await logAct.mutateAsync({ lead_id: lead.id, activity_type: "note", body: note });
    setNote(""); toast.success("Note ajoutée");
  };
  const markDoNotContact = async () => {
    await updateLead.mutateAsync({ id: lead.id, patch: {
      consent_status: "do_not_contact", lead_status: "do_not_contact",
      opt_out_at: new Date().toISOString(), opt_out_reason: "Demande du client",
    }});
    toast.success("Marqué « Ne pas contacter »");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-[#060B14] border-white/10 text-white w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-white flex flex-wrap items-center gap-2">
            {lead.business_name || "Prospect"}
            <ConsentBadge lead={lead} />
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-4">
          {!canMessage && (
            <div className="flex items-start gap-2 text-xs bg-amber-500/10 border border-amber-500/30 rounded p-3 text-amber-200">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Permission requise avant l'envoi. Aucun courriel ou SMS ne peut être envoyé sans consentement explicite du client.</span>
            </div>
          )}

          {/* Contact */}
          <section className="space-y-1 text-sm">
            <div className="text-white/60">{lead.contact_name || "—"}</div>
            <div className="text-white/80">{lead.email || "—"} · {lead.phone || "—"}</div>
            <div className="text-white/60 text-xs">{[lead.trade, lead.city, lead.rbq && `RBQ ${lead.rbq}`].filter(Boolean).join(" · ")}</div>
          </section>

          {/* Pipeline */}
          <section>
            <div className="text-xs text-white/50 mb-1">Pipeline</div>
            <Select value={lead.lead_status} onValueChange={setStatus}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#0B1220] text-white border-white/10 max-h-[60vh]">
                {LEAD_STATUS_PIPELINE.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </section>

          {/* Quick actions */}
          <section className="grid grid-cols-2 gap-2">
            {lead.phone && (
              <Button asChild variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/5">
                <a href={`tel:${lead.phone}`} onClick={() => logAct.mutate({ lead_id: lead.id, activity_type: "call", direction: "outbound" })}>
                  <Phone className="h-3 w-3 mr-1" /> Appeler
                </a>
              </Button>
            )}
            <Button size="sm" onClick={() => setConsentOpen(true)} className="bg-emerald-500 text-black hover:bg-emerald-400">
              <ShieldCheck className="h-3 w-3 mr-1" /> Marquer permission
            </Button>
            <SendButton kind="email" canMessage={canMessage} disabled={!lead.email}
              onClick={() => toast.info("Composez votre courriel — l'envoi requiert le module messagerie.")} />
            <SendButton kind="sms" canMessage={canMessage} disabled={!lead.phone}
              onClick={() => toast.info("SMS — l'envoi requiert le module messagerie.")} />
            <Button size="sm" variant="outline" onClick={() => setReminderOpen(true)}
              className="border-white/20 text-white hover:bg-white/5">
              <Calendar className="h-3 w-3 mr-1" /> Rappel
            </Button>
            <Button size="sm" variant="outline" onClick={() => setStatus("demo_scheduled")}
              className="border-white/20 text-white hover:bg-white/5">
              <ArrowRightCircle className="h-3 w-3 mr-1" /> Démo
            </Button>
            <Button size="sm" variant="outline" onClick={() => setStatus("lost")}
              className="border-white/20 text-white hover:bg-white/5">
              <Archive className="h-3 w-3 mr-1" /> Archiver
            </Button>
            <Button size="sm" variant="outline" onClick={markDoNotContact}
              className="border-red-500/30 text-red-300 hover:bg-red-500/10">
              <Ban className="h-3 w-3 mr-1" /> Ne pas contacter
            </Button>
          </section>

          {/* Note */}
          <section>
            <div className="text-xs text-white/50 mb-1 flex items-center gap-1"><FileText className="h-3 w-3" /> Ajouter une note</div>
            <Textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder="Notes sur l'interaction…"
              className="bg-white/5 border-white/10 text-white min-h-[80px]" />
            <Button size="sm" onClick={addNote} className="mt-2 bg-amber-500 text-black hover:bg-amber-400">Enregistrer</Button>
          </section>

          {/* Activities timeline */}
          <section>
            <div className="text-xs text-white/50 mb-2">Historique</div>
            <div className="space-y-2">
              {(activities ?? []).length === 0 && <div className="text-xs text-white/40">Aucune activité.</div>}
              {(activities ?? []).map((a: any) => (
                <div key={a.id} className="text-xs border border-white/10 bg-white/5 rounded p-2">
                  <div className="flex justify-between text-white/50">
                    <span>{a.activity_type}{a.direction ? ` · ${a.direction}` : ""}</span>
                    <span>{new Date(a.created_at).toLocaleString("fr-CA")}</span>
                  </div>
                  {a.subject && <div className="text-white/80 mt-1">{a.subject}</div>}
                  {a.body && <div className="text-white/70 mt-0.5">{a.body}</div>}
                </div>
              ))}
            </div>
          </section>
        </div>

        <RecordConsentModal leadId={lead.id} open={consentOpen} onOpenChange={setConsentOpen} />
        <ReminderModal leadId={lead.id} open={reminderOpen} onOpenChange={setReminderOpen} />
      </SheetContent>
    </Sheet>
  );
}

function SendButton({ kind, canMessage, disabled, onClick }: { kind: "email" | "sms"; canMessage: boolean; disabled?: boolean; onClick: () => void }) {
  const Icon = kind === "email" ? Mail : MessageSquare;
  const label = kind === "email" ? "Courriel" : "SMS";
  const blocked = !canMessage;
  const btn = (
    <Button size="sm" variant="outline" disabled={blocked || disabled} onClick={onClick}
      className={`border-white/20 text-white hover:bg-white/5 ${blocked ? "opacity-50 cursor-not-allowed" : ""}`}>
      <Icon className="h-3 w-3 mr-1" /> {label}
    </Button>
  );
  if (!blocked) return btn;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild><span>{btn}</span></TooltipTrigger>
        <TooltipContent>Permission requise avant l'envoi.</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
