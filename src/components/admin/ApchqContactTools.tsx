/**
 * Admin-only contact reveal + manual call notes for manual import rows.
 * - Reveal is explicit, logged in admin_action_logs WITHOUT phone/email, auto re-masks after 2 min.
 * - "Appeler" only opens tel: on the admin's device; it never records a successful call.
 * - Call notes are journal entries; they never change send_enabled/dispatchable or eligibility.
 */
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const REVEAL_TTL_MS = 2 * 60 * 1000;

export const toTelHref = (p: string | null) => {
  const d = (p ?? "").replace(/\D/g, "");
  const e = d.length === 10 ? `+1${d}` : d.length === 11 && d.startsWith("1") ? `+${d}` : null;
  return e ? `tel:${e}` : null;
};
export const formatPhone = (p: string | null) => {
  const d = (p ?? "").replace(/\D/g, "").slice(-10);
  return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : p ?? "—";
};

async function logAction(action_type: string, rowId: string, extra: Record<string, unknown> = {}, notes?: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("not_authenticated");
  const { error } = await supabase.from("admin_action_logs").insert({
    actor_user_id: u.user.id, action_type, notes: notes ?? null,
    payload_json: { import_row_id: rowId, ...extra } as any,
  });
  if (error) throw error;
}

export function ContactReveal({ rowId, phone, email, masked }: { rowId: string; phone: string | null; email: string | null; masked: string }) {
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef<number | null>(null);
  const arm = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setShown(false), REVEAL_TTL_MS);
  };
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const reveal = async () => {
    setBusy(true);
    try {
      await logAction("manual_import_contact_reveal", rowId);
      setShown(true); arm();
    } catch {
      toast.error("Affichage refusé : connexion administrateur requise ou journal indisponible.");
    } finally { setBusy(false); }
  };
  const copy = async (v: string, kind: string) => {
    arm();
    try { await navigator.clipboard.writeText(v); toast.success(`${kind} copié`); } catch { toast.error("Copie impossible"); }
  };
  const tel = toTelHref(phone);

  if (!shown) {
    return (
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{masked}</span>
        <Button size="sm" variant="outline" className="min-h-11" onClick={reveal} disabled={busy}>Afficher les coordonnées</Button>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-border p-2 space-y-2" onPointerDown={arm}>
      <div className="flex flex-wrap items-center gap-2">
        {tel ? <a href={tel} className="text-base font-semibold text-primary underline">{formatPhone(phone)}</a> : <span>{phone ?? "Aucun téléphone"}</span>}
        {tel && (
          <>
            <Button asChild size="sm" className="min-h-11"><a href={tel} onClick={() => { void logAction("manual_import_call_opened", rowId).catch(() => {}); }}>Appeler</a></Button>
            <Button size="sm" variant="outline" className="min-h-11" onClick={() => copy(formatPhone(phone), "Numéro")}>Copier</Button>
          </>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {email ? <a href={`mailto:${email}`} className="text-sm text-primary underline break-all">{email}</a> : <span className="text-sm">Aucun courriel</span>}
        {email && <Button size="sm" variant="outline" className="min-h-11" onClick={() => copy(email, "Courriel")}>Copier</Button>}
      </div>
      <div className="flex justify-between items-center">
        <p className="text-[11px] text-muted-foreground">Masqué automatiquement après 2 min. Aucun envoi autorisé.</p>
        <Button size="sm" variant="ghost" className="min-h-11" onClick={() => setShown(false)}>Masquer</Button>
      </div>
    </div>
  );
}

export const CALL_OUTCOMES = {
  joint: "Joint",
  a_rappeler: "À rappeler",
  pas_de_reponse: "Pas de réponse",
  consentement_explicite_declare: "Consentement explicite déclaré par l'admin",
  refus_stop: "Refus / ne plus contacter",
} as const;
type Outcome = keyof typeof CALL_OUTCOMES;

export function validateCallNote(outcome: Outcome | "", note: string, consentScope: string): string | null {
  if (!outcome) return "Choisissez l'issue de l'appel";
  if (note.trim().length < 10) return "Note requise (10 caractères min.)";
  if (outcome === "consentement_explicite_declare" && consentScope.trim().length < 15)
    return "Décrivez précisément la permission obtenue (canal, objet, date, personne)";
  return null;
}

export function CallNoteForm({ rowId, onSaved }: { rowId: string; onSaved?: () => void }) {
  const [outcome, setOutcome] = useState<Outcome | "">("");
  const [note, setNote] = useState("");
  const [scope, setScope] = useState("");
  const [busy, setBusy] = useState(false);
  const err = validateCallNote(outcome, note, scope);
  const save = async () => {
    if (err || !outcome) return;
    setBusy(true);
    try {
      await logAction("manual_import_call_note", rowId, { outcome, consent_scope: outcome === "consentement_explicite_declare" ? scope.trim() : null }, note.trim());
      toast.success("Note d'appel enregistrée (aucun envoi, admissibilité inchangée)");
      setOutcome(""); setNote(""); setScope(""); onSaved?.();
    } catch { toast.error("Enregistrement refusé"); } finally { setBusy(false); }
  };
  return (
    <div className="rounded-lg border border-border p-2 space-y-2">
      <p className="text-xs font-medium text-foreground">Note après appel manuel</p>
      <select aria-label="Issue de l'appel" className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" value={outcome} onChange={(e) => setOutcome(e.target.value as Outcome)}>
        <option value="">Issue de l'appel…</option>
        {Object.entries(CALL_OUTCOMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <Textarea placeholder="Ce qui a été dit (sans inventer)" value={note} onChange={(e) => setNote(e.target.value)} />
      {outcome === "consentement_explicite_declare" && (
        <Input placeholder="Permission précise : canal, objet, nom, date" value={scope} onChange={(e) => setScope(e.target.value)} />
      )}
      <p className="text-[11px] text-muted-foreground">Un appel B2B ne prouve ni un mobile ni un consentement SMS. Cette note n'active aucun envoi.</p>
      {err && outcome && <p className="text-[11px] text-destructive">{err}</p>}
      <Button size="sm" className="min-h-11 w-full" disabled={!!err || busy} onClick={save}>Enregistrer la note</Button>
    </div>
  );
}
