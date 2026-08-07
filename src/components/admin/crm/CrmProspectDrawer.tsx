/**
 * UNPRO — CRM prospect detail drawer: timeline, notes, tags, contextual actions.
 */
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  actionsForStage,
  runCrmAction,
  useProspectTimeline,
  type CrmProspect,
} from "@/hooks/useCrmOperations";
import { Loader2, Mail, Phone, MapPin, Tag as TagIcon } from "lucide-react";

interface Props {
  prospect: CrmProspect | null;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export default function CrmProspectDrawer({ prospect, open, onClose, onRefresh }: Props) {
  const { entries, loading, reload } = useProspectTimeline(prospect?.prospect_id ?? null);
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!prospect) return;
    (supabase as any)
      .from("crm_prospect_notes")
      .select("*")
      .eq("prospect_id", prospect.prospect_id)
      .order("created_at", { ascending: false })
      .then(({ data }: any) => setNotes(data ?? []));
  }, [prospect]);

  if (!prospect) return null;

  const act = async (action: string) => {
    setBusy(action);
    try {
      const r = await runCrmAction(action, [prospect.prospect_id]);
      if (r.failed > 0) toast.error("Action échouée", { description: JSON.stringify(r.results?.[0]?.result ?? "") });
      else if (r.skipped > 0) toast.info("Action ignorée (déjà effectuée aujourd'hui ou désabonné)");
      else toast.success("Action exécutée");
      reload();
      onRefresh();
    } catch (e: any) {
      toast.error("Action échouée", { description: e?.message });
    } finally {
      setBusy(null);
    }
  };

  const addNote = async () => {
    if (!note.trim()) return;
    setBusy("note");
    try {
      const r = await runCrmAction("add_note", [prospect.prospect_id], { payload: { note: note.trim() } });
      // The function returns per-prospect results; a transport success can still
      // carry a failed write. Never claim the note was saved without checking.
      if (r?.failed > 0) {
        const detail = r.results?.[0]?.result ?? "Erreur inconnue";
        toast.error("Note non enregistrée", { description: String(detail) });
        return;
      }
      setNote("");
      const { data, error } = await (supabase as any)
        .from("crm_prospect_notes")
        .select("*")
        .eq("prospect_id", prospect.prospect_id)
        .order("created_at", { ascending: false });
      if (error) {
        toast.error("Note enregistrée, relecture impossible", { description: error.message });
      } else {
        setNotes(data ?? []);
        toast.success("Note ajoutée");
      }
    } catch (e: any) {
      toast.error("Note non enregistrée", { description: e?.message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left">{prospect.business_name ?? "Prospect"}</SheetTitle>
        </SheetHeader>

        <div className="mt-3 space-y-4">
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {prospect.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{prospect.city}</span>}
            {prospect.phone_e164 && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{prospect.phone_e164}</span>}
            {prospect.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{prospect.email}</span>}
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-[10px]">Étape : {prospect.current_stage}</Badge>
            <Badge variant="outline" className="text-[10px]">Priorité {prospect.priority_score}</Badge>
            <Badge variant="outline" className="text-[10px]">Santé {prospect.health_score}</Badge>
            {prospect.opted_out && <Badge variant="destructive" className="text-[10px]">Désabonné</Badge>}
            {(prospect.tags ?? []).map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px] flex items-center gap-1">
                <TagIcon className="h-3 w-3" />{t}
              </Badge>
            ))}
          </div>

          {prospect.last_error && (
            <p className="text-xs text-destructive break-words">Dernière erreur : {prospect.last_error}</p>
          )}

          <div>
            <p className="text-xs font-semibold mb-2">Prochaine meilleure action</p>
            <div className="flex flex-wrap gap-2">
              {actionsForStage(prospect).map((a) => (
                <Button
                  key={a.action}
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  disabled={a.disabled || busy !== null || prospect.opted_out}
                  onClick={() => act(a.action)}
                >
                  {busy === a.action && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                  {a.label}
                </Button>
              ))}
              <Button size="sm" variant="ghost" className="h-8 text-xs" disabled={busy !== null} onClick={() => act("pause")}>
                Mettre en pause
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs" disabled={busy !== null} onClick={() => act("archive")}>
                Archiver
              </Button>
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-xs font-semibold mb-2">Chronologie</p>
            {loading ? (
              <p className="text-xs text-muted-foreground">Chargement…</p>
            ) : entries.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucun événement.</p>
            ) : (
              <ol className="space-y-2 border-l border-border/50 pl-3">
                {entries.map((e, i) => (
                  <li key={i} className="text-xs">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium">{e.label}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {new Date(e.occurred_at).toLocaleString("fr-CA")}
                      </span>
                    </div>
                    {e.detail && <p className="text-muted-foreground break-words">{e.detail}</p>}
                  </li>
                ))}
              </ol>
            )}
          </div>

          <Separator />

          <div>
            <p className="text-xs font-semibold mb-2">Notes</p>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ajouter une note interne…"
              className="text-xs min-h-[70px]"
            />
            <Button size="sm" className="mt-2 h-8 text-xs" disabled={busy !== null || !note.trim()} onClick={addNote}>
              Enregistrer la note
            </Button>
            <div className="mt-3 space-y-2">
              {notes.map((n) => (
                <div key={n.id} className="rounded-md border border-border/40 p-2 text-xs">
                  <p className="whitespace-pre-wrap">{n.note}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(n.created_at).toLocaleString("fr-CA")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
