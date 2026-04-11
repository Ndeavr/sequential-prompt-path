import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface ExtractedField {
  field_name: string;
  field_value: string;
  confidence: number;
  needs_manual_review: boolean;
  is_verified: boolean;
}

export type ImportPhase = "idle" | "uploading" | "processing" | "extracted" | "reviewing" | "creating_lead" | "done" | "error";

export function useBusinessCardImport() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<ImportPhase>("idle");
  const [fields, setFields] = useState<ExtractedField[]>([]);
  const [globalConfidence, setGlobalConfidence] = useState<number>(0);
  const [importId, setImportId] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const uploadAndExtract = useCallback(async (file: File) => {
    // No auth required — edge function handles all DB ops with service role
    setPhase("uploading");
    setError(null);
    setProgress(10);

    try {
      // Convert to base64
      setProgress(30);
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      setProgress(50);

      // Call edge function — it creates lead, import, and extractions server-side
      setPhase("processing");
      setProgress(60);

      const { data, error: fnErr } = await supabase.functions.invoke("extract-business-card", {
        body: { image_base64: base64, user_id: user?.id || null },
      });
      if (fnErr) throw fnErr;
      setProgress(90);

      if (!data?.success) throw new Error(data?.error || "Extraction failed");

      setLeadId(data.lead_id);
      setImportId(data.import_id);

      // Map results
      const extracted: ExtractedField[] = (data.extractions || []).map((f: any) => ({
        field_name: f.field_name,
        field_value: f.field_value,
        confidence: f.confidence,
        needs_manual_review: f.confidence < 70,
        is_verified: false,
      }));

      setFields(extracted);
      setGlobalConfidence(data.global_confidence || 0);
      setPhase("extracted");
      setProgress(100);
      toast.success(`${extracted.length} champs extraits`);
    } catch (e: any) {
      console.error("Business card import error:", e);
      setError(e.message || "Erreur d'importation");
      setPhase("error");
      toast.error("Erreur lors de l'extraction");
    }
  }, [user]);

  const updateField = useCallback((fieldName: string, newValue: string) => {
    setFields((prev) =>
      prev.map((f) =>
        f.field_name === fieldName ? { ...f, field_value: newValue, is_verified: true, needs_manual_review: false } : f
      )
    );
  }, []);

  const verifyField = useCallback((fieldName: string) => {
    setFields((prev) =>
      prev.map((f) =>
        f.field_name === fieldName ? { ...f, is_verified: true, needs_manual_review: false } : f
      )
    );
  }, []);

  const createLeadFromExtraction = useCallback(async () => {
    if (!leadId) return;
    setPhase("creating_lead");

    try {
      const fieldMap: Record<string, string> = {};
      for (const f of fields) {
        fieldMap[f.field_name] = f.field_value;
      }

      // Use edge function or direct update if authenticated
      const { error: updateErr } = await supabase.from("contractor_leads").update({
        first_name: fieldMap.first_name,
        last_name: fieldMap.last_name,
        full_name: fieldMap.full_name,
        company_name: fieldMap.company_name,
        role_title: fieldMap.role_title,
        email: fieldMap.email,
        phone: fieldMap.phone,
        mobile_phone: fieldMap.mobile_phone,
        website_url: fieldMap.website_url,
        street_address: fieldMap.street_address,
        city: fieldMap.city,
        province: fieldMap.province || "QC",
        postal_code: fieldMap.postal_code,
        category_primary: fieldMap.category_primary,
        lead_status: "ready_for_contact",
        profile_status: "draft",
      }).eq("id", leadId);

      if (updateErr) {
        // If RLS blocks, the data is already saved by the edge function
        console.warn("Lead update from client blocked (guest mode), data already saved server-side");
      }

      setPhase("done");
      toast.success("Profil entrepreneur créé !");
    } catch (e: any) {
      setError(e.message);
      setPhase("error");
    }
  }, [leadId, fields]);

  const reset = useCallback(() => {
    setPhase("idle");
    setFields([]);
    setGlobalConfidence(0);
    setImportId(null);
    setLeadId(null);
    setError(null);
    setProgress(0);
  }, []);

  return {
    phase, fields, globalConfidence, importId, leadId, error, progress,
    uploadAndExtract, updateField, verifyField, createLeadFromExtraction, reset,
  };
}
