/**
 * BusinessCardCapture — camera/gallery upload → extract-business-card → returns DraftLead.
 */
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Loader2, Image as ImageIcon } from "lucide-react";
import type { DraftLead } from "./useAddLead";
import { formatPhoneDisplay } from "../lib/phoneUtils";

interface Props {
  affiliateId: string;
  onExtracted: (draft: DraftLead) => void;
}

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((res, rej) => {
    const r = new FileReader();
    r.onerror = () => rej(r.error);
    r.onload = () => res(r.result as string);
    r.readAsDataURL(file);
  });
}

export function BusinessCardCapture({ affiliateId, onExtracted }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>("");

  async function handleFile(f: File) {
    setBusy(true); setError(null); setProgress("Téléversement…");
    try {
      // Upload to storage
      const ext = f.name.split(".").pop() || "jpg";
      const key = `${affiliateId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("business-cards").upload(key, f, { contentType: f.type });
      if (up.error) throw up.error;
      const { data: signed } = await supabase.storage.from("business-cards").createSignedUrl(key, 60 * 60 * 24 * 7);
      const business_card_url = signed?.signedUrl || up.data?.path || "";

      setProgress("Analyse IA…");
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
        mobile_phone: ex.mobile_phone ?? undefined,
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
        source_label: "business_card_scan",
      };
      onExtracted(draft);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Erreur d'extraction");
    } finally {
      setBusy(false); setProgress("");
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Photographiez la carte d'affaires ou choisissez une image existante. Vous validerez les données à la prochaine étape.
      </p>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <input ref={galleryRef} type="file" accept="image/*,application/pdf" className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" size="lg" className="h-16 flex-col gap-1" onClick={() => cameraRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
          <span className="text-xs">Prendre une photo</span>
        </Button>
        <Button type="button" variant="outline" size="lg" className="h-16 flex-col gap-1" onClick={() => galleryRef.current?.click()} disabled={busy}>
          <ImageIcon className="h-5 w-5" />
          <span className="text-xs">Choisir une image</span>
        </Button>
      </div>

      {busy && <p className="text-xs text-muted-foreground text-center">{progress}</p>}
      {error && <p className="text-xs text-destructive text-center">{error}</p>}
    </div>
  );
}
