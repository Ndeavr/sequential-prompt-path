/**
 * WebsiteEnrichment — URL or name/phone → enrich-lead-from-web → returns DraftLead.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Globe, Loader2 } from "lucide-react";
import type { DraftLead } from "./useAddLead";
import { formatPhoneDisplay } from "../lib/phoneUtils";

interface Props { onExtracted: (draft: DraftLead) => void; }

export function WebsiteEnrichment({ onExtracted }: Props) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    if (!input.trim()) return;
    setBusy(true); setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("enrich-lead-from-web", { body: { input } });
      if (error) throw error;
      const ex = (data as any)?.extracted ?? {};
      const first = (ex.contacts?.[0]?.name || "").split(/\s+/);
      const draft: DraftLead = {
        company_name: ex.company_name ?? ex.legal_name ?? undefined,
        contact_first_name: first[0] || undefined,
        contact_last_name: first.slice(1).join(" ") || undefined,
        role_title: ex.contacts?.[0]?.role ?? undefined,
        phone: ex.phone ? formatPhoneDisplay(ex.phone) : undefined,
        email: ex.email ?? undefined,
        website_url: ex.website_url ?? undefined,
        street_address: ex.street_address ?? undefined,
        city: ex.city ?? undefined,
        province: ex.province ?? undefined,
        postal_code: ex.postal_code ?? undefined,
        category_primary: ex.category ?? undefined,
        extraction_raw: ex,
        extraction_confidence: ex.confidence ?? {},
        consent_channel: "public_website",
        consent_to_contact: "unknown",
        source_label: "website_enrichment",
      };
      onExtracted(draft);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Analyse impossible");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Collez une URL, un nom d'entreprise ou un numéro. On récupère automatiquement les infos publiques.
      </p>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="toituresabc.ca"
          inputMode="url"
          autoFocus
        />
        <Button onClick={analyze} disabled={busy || !input.trim()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
        </Button>
      </div>
      {busy && <p className="text-xs text-muted-foreground">Analyse du site en cours…</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
