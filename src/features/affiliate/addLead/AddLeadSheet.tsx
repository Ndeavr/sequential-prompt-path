/**
 * AddLeadSheet — bottom drawer on mobile / dialog-like on desktop.
 * Modes: picker → (quick | card | file | web) → validation → dedupe → save → actions.
 */
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PenLine, Camera, FileUp, Globe, ArrowLeft, Loader2, ClipboardList, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { QuickEntryForm } from "./QuickEntryForm";
import { BusinessCardCapture } from "./BusinessCardCapture";
import { WebsiteEnrichment } from "./WebsiteEnrichment";
import { FileImportFlow } from "./FileImportFlow";
import type { DraftLead } from "./useAddLead";
import { PasteImportFlow } from "./PasteImportFlow";
import { StageResultList } from "./StageResultList";
import { stageImport, type StageResult, type StageRow, type StageSource } from "./stageImport";
import { useQueryClient } from "@tanstack/react-query";

type Mode = "picker" | "quick" | "paste" | "csv" | "card" | "file" | "web" | "review" | "saved";

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
  const [origin, setOrigin] = useState<StageSource>("manual");
  const [saved, setSaved] = useState<{ row: StageRow; results: StageResult[] } | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() {
    setMode(initialMode); setDraft(null); setSaved(null); setBusy(false); setOrigin("manual");
  }
  function close() { reset(); onOpenChange(false); }

  /** Brouillon serveur (dédoublonnage fail-closed, aucune réservation ni attribution). */
  async function submit(d: DraftLead) {
    setBusy(true);
    try {
      const row: StageRow = {
        company_name: d.company_name, phone: d.phone || d.mobile_phone, email: d.email,
        website: d.website_url, city: d.city, category: d.category_primary,
      };
      const results = await stageImport([row], origin, null);
      setSaved({ row, results });
      setMode("saved");
      qc.invalidateQueries({ queryKey: ["affiliate-assignments"] });
    } catch (e: any) {
      toast.error(e.message || "Erreur d'enregistrement");
    } finally { setBusy(false); }
  }

  const title =
    mode === "picker" ? "Ajouter un prospect" :
    mode === "quick" ? "Saisir" :
    mode === "paste" ? "Coller une liste" :
    mode === "csv" ? "Fichier CSV" :
    mode === "card" ? "Photo de carte" :
    mode === "file" ? "Import fichier" :
    mode === "web" ? "Depuis un site Web" :
    mode === "review" ? "Vérifier les infos" :
    "Enregistré dans Mes imports";

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <SheetContent side="bottom" className="h-[92vh] rounded-t-3xl overflow-y-auto">
        <SheetHeader className="mb-3">
          <SheetTitle className="flex items-center gap-2">
            {mode !== "picker" && mode !== "saved" && (
              <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2" onClick={() => setMode("picker")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {title}
          </SheetTitle>
        </SheetHeader>

        {mode === "picker" && (
          <div className="grid grid-cols-2 gap-3">
            <ModeTile icon={PenLine} label="Saisir" onClick={() => { setOrigin("manual"); setMode("quick"); }} />
            <ModeTile icon={ClipboardList} label="Coller une liste" onClick={() => setMode("paste")} />
            <ModeTile icon={Camera} label="Photo" onClick={() => { setOrigin("photo"); setMode("card"); }} />
            <ModeTile icon={FileUp} label="Fichier (image / PDF)" onClick={() => { setOrigin("pdf"); setMode("file"); }} />
            <ModeTile icon={FileSpreadsheet} label="Fichier CSV" onClick={() => setMode("csv")} />
            <ModeTile icon={Globe} label="Site Web" onClick={() => { setOrigin("website"); setMode("web"); }} />
          </div>
        )}

        {mode === "quick" && (
          <QuickEntryForm
            onSubmit={(d) => submit(d)}
            submitting={busy}
          />
        )}

        {(mode === "paste" || mode === "csv") && <PasteImportFlow mode={mode} />}

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

        {mode === "review" && draft && (
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

        {busy && mode !== "quick" && mode !== "review" && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {mode === "saved" && saved && (
          <div className="space-y-3">
            <StageResultList rows={[saved.row]} results={saved.results} />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={reset}>Autre prospect</Button>
              <Button variant="ghost" onClick={close}>Fermer</Button>
            </div>
          </div>
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
