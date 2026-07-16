/**
 * AddLeadSheet — bottom drawer on mobile / dialog-like on desktop.
 * Modes: picker → (quick | card | file | web) → validation → dedupe → save → actions.
 */
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PenLine, Camera, FileUp, Globe, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { QuickEntryForm } from "./QuickEntryForm";
import { BusinessCardCapture } from "./BusinessCardCapture";
import { WebsiteEnrichment } from "./WebsiteEnrichment";
import { FileImportFlow } from "./FileImportFlow";
import { DuplicateWarning } from "./DuplicateWarning";
import { LeadCreatedActions } from "./LeadCreatedActions";
import type { DraftLead, DedupeResponse } from "./useAddLead";
import { checkDuplicate, insertLead } from "./useAddLead";
import { useQueryClient } from "@tanstack/react-query";

type Mode = "picker" | "quick" | "card" | "file" | "web" | "review" | "saved";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  affiliateId: string;
  initialMode?: Mode;
}

export function AddLeadSheet({ open, onOpenChange, affiliateId, initialMode = "picker" }: Props) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [draft, setDraft] = useState<DraftLead | null>(null);
  const [dedupe, setDedupe] = useState<DedupeResponse | null>(null);
  const [saved, setSaved] = useState<{ id: string; company_name: string; phone_e164: string | null; full_name: string | null } | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() {
    setMode(initialMode); setDraft(null); setDedupe(null); setSaved(null); setBusy(false);
  }
  function close() { reset(); onOpenChange(false); }

  async function submit(d: DraftLead, options: { ignoreDupe?: boolean } = {}) {
    setBusy(true);
    try {
      if (!options.ignoreDupe) {
        const dupe = await checkDuplicate(d);
        if (dupe.match) {
          setDraft(d);
          setDedupe(dupe);
          return;
        }
      }
      const row = await insertLead(d, affiliateId);
      setSaved(row as any);
      setMode("saved");
      qc.invalidateQueries({ queryKey: ["affiliate-assignments"] });
      toast.success("Prospect ajouté");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erreur d'enregistrement");
    } finally { setBusy(false); }
  }

  const title =
    mode === "picker" ? "Ajouter un prospect" :
    mode === "quick" ? "Saisie rapide" :
    mode === "card" ? "Photo de carte" :
    mode === "file" ? "Import fichier" :
    mode === "web" ? "Depuis un site Web" :
    mode === "review" ? "Vérifier les infos" :
    "Prospect ajouté";

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <SheetContent side="bottom" className="h-[92vh] rounded-t-3xl overflow-y-auto">
        <SheetHeader className="mb-3">
          <SheetTitle className="flex items-center gap-2">
            {mode !== "picker" && mode !== "saved" && (
              <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2" onClick={() => { setDedupe(null); setMode("picker"); }}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {title}
          </SheetTitle>
        </SheetHeader>

        {mode === "picker" && (
          <div className="grid grid-cols-2 gap-3">
            <ModeTile icon={PenLine} label="Saisie rapide" onClick={() => setMode("quick")} />
            <ModeTile icon={Camera} label="Photo de carte" onClick={() => setMode("card")} />
            <ModeTile icon={FileUp} label="Fichier / PDF" onClick={() => setMode("file")} />
            <ModeTile icon={Globe} label="Site Web" onClick={() => setMode("web")} />
          </div>
        )}

        {mode === "quick" && (
          <QuickEntryForm
            onSubmit={(d) => submit(d)}
            submitting={busy}
          />
        )}

        {mode === "card" && (
          <BusinessCardCapture
            affiliateId={affiliateId}
            onExtracted={(d) => { setDraft(d); setMode("review"); }}
          />
        )}

        {mode === "file" && (
          <FileImportFlow
            affiliateId={affiliateId}
            onExtracted={(d) => { setDraft(d); setMode("review"); }}
          />
        )}

        {mode === "web" && (
          <WebsiteEnrichment
            onExtracted={(d) => { setDraft(d); setMode("review"); }}
          />
        )}

        {mode === "review" && draft && !dedupe?.match && (
          <>
            <p className="text-xs text-muted-foreground mb-3">
              Vérifiez et corrigez avant d'enregistrer. Rien n'est sauvegardé automatiquement.
            </p>
            <QuickEntryForm
              initial={draft}
              onSubmit={(d) => submit(d)}
              submitting={busy}
            />
          </>
        )}

        {dedupe?.match && draft && (
          <DuplicateWarning
            match={dedupe.match}
            onView={() => { window.location.href = `/affiliate/company/${dedupe.match!.id}`; }}
            onCancel={close}
            onProceed={() => { setDedupe(null); submit(draft, { ignoreDupe: true }); }}
          />
        )}

        {busy && mode !== "quick" && mode !== "review" && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {mode === "saved" && saved && (
          <LeadCreatedActions
            leadId={saved.id}
            companyName={saved.company_name}
            phoneE164={saved.phone_e164}
            contactName={saved.full_name}
            onAddAnother={reset}
            onDone={close}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function ModeTile({ icon: Icon, label, onClick }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-28 rounded-2xl border border-border/40 bg-card hover:bg-muted/50 transition flex flex-col items-center justify-center gap-2 p-4"
    >
      <Icon className="h-7 w-7 text-primary" />
      <span className="text-sm font-medium text-foreground text-center leading-tight">{label}</span>
    </button>
  );
}
