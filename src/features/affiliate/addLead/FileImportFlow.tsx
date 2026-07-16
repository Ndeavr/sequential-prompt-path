/**
 * FileImportFlow — accept images / PDFs / CSV / XLSX. For MVP: single image/PDF → extract-business-card.
 * CSV/XLSX mass import is scoped for phase 2; we surface a clear message.
 */
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { FileUp, Loader2 } from "lucide-react";
import type { DraftLead } from "./useAddLead";
import { formatPhoneDisplay } from "../lib/phoneUtils";

interface Props {
  affiliateId: string;
  onExtracted: (draft: DraftLead) => void;
}

async function fileToDataUrl(f: File): Promise<string> {
  return await new Promise((res, rej) => {
    const r = new FileReader();
    r.onerror = () => rej(r.error);
    r.onload = () => res(r.result as string);
    r.readAsDataURL(f);
  });
}

export function FileImportFlow({ affiliateId, onExtracted }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(f: File) {
    setBusy(true); setError(null);
    try {
      const t = f.type.toLowerCase();
      if (t.includes("csv") || t.includes("spreadsheet") || t.includes("excel") || f.name.match(/\.(csv|xlsx?|xls)$/i)) {
        setError("L'import CSV/XLSX arrive bientôt. Pour l'instant, ajoutez les prospects un par un.");
        return;
      }
      // Upload
      const ext = f.name.split(".").pop() || "bin";
      const key = `${affiliateId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("business-cards").upload(key, f, { contentType: f.type });
      if (up.error) throw up.error;
      const { data: signed } = await supabase.storage.from("business-cards").createSignedUrl(key, 60 * 60 * 24 * 7);
      const business_card_url = signed?.signedUrl || up.data?.path || "";
      // Extract
      const dataUrl = await fileToDataUrl(f);
      const { data, error } = await supabase.functions.invoke("extract-business-card", {
        body: { image_data_url: dataUrl, mime_type: f.type },
      });
      if (error) throw error;
      const ex = (data as any)?.extracted ?? {};
      const draft: DraftLead = {
        company_name: ex.company_name ?? undefined,
        contact_first_name: ex.contact_first_name ?? undefined,
        contact_last_name: ex.contact_last_name ?? undefined,
        role_title: ex.role_title ?? undefined,
        phone: ex.phone ? formatPhoneDisplay(ex.phone) : undefined,
        email: ex.email ?? undefined,
        website_url: ex.website_url ?? undefined,
        street_address: ex.street_address ?? undefined,
        city: ex.city ?? undefined,
        province: ex.province ?? undefined,
        postal_code: ex.postal_code ?? undefined,
        business_card_url,
        extraction_raw: ex,
        extraction_confidence: ex.confidence ?? {},
        consent_channel: "business_card",
        consent_to_contact: "unknown",
        source_label: "file_import",
      };
      onExtracted(draft);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Import impossible");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Formats acceptés : JPG, PNG, HEIC, PDF. (CSV et Excel arrivent bientôt.)
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf,.csv,.xls,.xlsx"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <Button onClick={() => inputRef.current?.click()} disabled={busy} className="w-full h-14">
        {busy ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <FileUp className="h-5 w-5 mr-2" />}
        Choisir un fichier
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
