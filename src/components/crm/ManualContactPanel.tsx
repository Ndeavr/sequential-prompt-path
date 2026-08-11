/**
 * UNPRO — Panneau de contact manuel (partagé Admin + Affilié).
 * 5 actions 1-clic : APPELER, SMS, COURRIEL, PROFIL, LIEN 1 $.
 * Journalise chaque action via crm-recovery-action (audit + garde anti-doublon).
 */
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Phone, MessageSquare, Mail, ExternalLink, Link2, Loader2, ClipboardCheck } from "lucide-react";
import {
  OUTCOMES, TERMINAL_OUTCOMES, contactHref, profileHref, activationHref, queueActions,
} from "@/hooks/useManualContactQueue";

export type ManualContactTarget = {
  prospect_id: string;
  business_name: string | null;
  phone_e164: string | null;
  email: string | null;
  activation_token: string | null;
  opted_out?: boolean;
};

export default function ManualContactPanel({
  target,
  canLogOutcome = true,
  onDone,
  compact = false,
}: {
  target: ManualContactTarget;
  canLogOutcome?: boolean;
  onDone?: () => void;
  compact?: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [outcome, setOutcome] = useState("follow_up");
  const [objection, setObjection] = useState("");
  const [note, setNote] = useState("");
  const [nextAction, setNextAction] = useState("Rappeler");
  const [dueAt, setDueAt] = useState(() =>
    new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 16),
  );

  const terminal = TERMINAL_OUTCOMES.has(outcome);

  async function openChannel(kind: "call" | "sms" | "email") {
    const href = contactHref(kind, target);
    if (!href) return toast.error("Coordonnée manquante");
    window.location.href = href;
    try {
      await queueActions.logManualContact(target.prospect_id, kind);
    } catch {
      /* la journalisation ne doit jamais bloquer l'appel */
    }
    onDone?.();
  }

  async function sendLink(channel: "sms" | "email") {
    setBusy(channel);
    try {
      const r = await queueActions.sendActivationLink([target.prospect_id], channel);
      if (r.failed > 0) toast.error("Envoi refusé", { description: r.results?.[0]?.result });
      else if (r.skipped > 0) toast.info("Déjà envoyé aujourd'hui (garde anti-doublon)");
      else toast.success("Lien 1 $ envoyé");
      onDone?.();
    } catch (e: any) {
      toast.error("Envoi échoué", { description: e?.message });
    } finally {
      setBusy(null);
    }
  }

  async function submitOutcome() {
    setBusy("outcome");
    try {
      const r = await queueActions.logOutcome(target.prospect_id, {
        outcome,
        objection: objection || null,
        note: note || null,
        channel: "call",
        next_action: terminal ? null : nextAction,
        due_at: terminal ? null : new Date(dueAt).toISOString(),
      });
      if (r.failed > 0) toast.error("Résultat non enregistré", { description: r.results?.[0]?.result });
      else {
        toast.success(terminal ? "Prospect clôturé" : "Résultat enregistré");
        setOutcomeOpen(false);
        setNote("");
        setObjection("");
      }
      onDone?.();
    } catch (e: any) {
      toast.error("Résultat non enregistré", { description: e?.message });
    } finally {
      setBusy(null);
    }
  }

  const link = activationHref(target.activation_token);
  const size = compact ? "h-8 text-[11px]" : "h-9 text-xs";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" variant="outline" className={size} disabled={!target.phone_e164}
          onClick={() => openChannel("call")}>
          <Phone className="h-3.5 w-3.5 mr-1" /> Appeler
        </Button>
        <Button size="sm" variant="outline" className={size} disabled={!target.phone_e164 || target.opted_out}
          onClick={() => openChannel("sms")}>
          <MessageSquare className="h-3.5 w-3.5 mr-1" /> SMS
        </Button>
        <Button size="sm" variant="outline" className={size} disabled={!target.email || target.opted_out}
          onClick={() => openChannel("email")}>
          <Mail className="h-3.5 w-3.5 mr-1" /> Courriel
        </Button>
        <Button size="sm" variant="outline" className={size}
          onClick={() => window.open(profileHref(target.prospect_id), "_blank")}>
          <ExternalLink className="h-3.5 w-3.5 mr-1" /> Profil
        </Button>
        <Button size="sm" className={size} disabled={busy !== null || target.opted_out}
          onClick={() => sendLink(target.email ? "email" : "sms")}>
          {busy ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Link2 className="h-3.5 w-3.5 mr-1" />}
          Lien 1 $
        </Button>
        {canLogOutcome && (
          <Button size="sm" variant="secondary" className={size} onClick={() => setOutcomeOpen(true)}>
            <ClipboardCheck className="h-3.5 w-3.5 mr-1" /> Résultat
          </Button>
        )}
      </div>

      {link && (
        <button
          type="button"
          className="text-[10px] text-muted-foreground underline underline-offset-2 truncate max-w-full block text-left"
          onClick={() => { navigator.clipboard.writeText(link); toast.success("Lien copié"); }}
        >
          {link}
        </button>
      )}
      {target.opted_out && <Badge variant="destructive" className="text-[9px]">Désabonné — envois bloqués</Badge>}

      <Dialog open={outcomeOpen} onOpenChange={setOutcomeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Résultat — {target.business_name ?? "Prospect"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Résultat</label>
              <Select value={outcome} onValueChange={setOutcome}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OUTCOMES.map((o) => (
                    <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!terminal && (
              <>
                <div>
                  <label className="text-xs text-muted-foreground">Prochaine action</label>
                  <Input value={nextAction} onChange={(e) => setNextAction(e.target.value)} className="h-9 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Échéance</label>
                  <Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="h-9 text-sm" />
                </div>
              </>
            )}
            <div>
              <label className="text-xs text-muted-foreground">Objection (optionnel)</label>
              <Input value={objection} onChange={(e) => setObjection(e.target.value)} className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Note</label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOutcomeOpen(false)}>Annuler</Button>
            <Button onClick={submitOutcome} disabled={busy === "outcome"}>
              {busy === "outcome" && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
