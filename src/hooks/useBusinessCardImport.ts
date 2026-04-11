/**
 * UNPRO — useBusinessCardImport hook (v2)
 * Supports multi-role scanner sessions with attribution tracking.
 */
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

export type ScannerModeCode = "admin_assist" | "field_rep_activation" | "affiliate_referral_capture" | "contractor_self_or_team_capture" | null;

export function useBusinessCardImport() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<ImportPhase>("idle");
  const [fields, setFields] = useState<ExtractedField[]>([]);
  const [globalConfidence, setGlobalConfidence] = useState<number>(0);
  const [importId, setImportId] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const startSession = useCallback(async (modeCode: ScannerModeCode, roleCode: string) => {
    if (!user?.id || !modeCode) return null;
    try {
      const { data, error: err } = await supabase
        .from("scanner_sessions")
        .insert({
          scanned_by_user_id: user.id,
          active_role_code: roleCode,
          session_mode_code: modeCode,
          session_status: "started",
          attribution_status: "pending",
        })
        .select("id")
        .single();
      if (err) throw err;
      setSessionId(data.id);
      return data.id;
    } catch (e: any) {
      console.warn("Session creation failed:", e.message);
      return null;
    }
  }, [user]);

  const uploadAndExtract = useCallback(async (file: File) => {
    setPhase("uploading");
    setError(null);
    setProgress(10);

    try {
      setProgress(30);
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      setProgress(50);

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

      // Link session to import/lead if session exists
      if (sessionId && data.import_id) {
        supabase
          .from("scanner_sessions")
          .update({
            business_card_import_id: data.import_id,
            contractor_lead_id: data.lead_id,
            session_status: "extracted",
          })
          .eq("id", sessionId)
          .then(() => {});
      }

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
  }, [user, sessionId]);

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
        console.warn("Lead update from client blocked (guest mode), data already saved server-side");
      }

      // Complete session
      if (sessionId) {
        supabase
          .from("scanner_sessions")
          .update({ session_status: "completed", completed_at: new Date().toISOString() })
          .eq("id", sessionId)
          .then(() => {});
      }

      setPhase("done");
      toast.success("Profil entrepreneur créé !");
    } catch (e: any) {
      setError(e.message);
      setPhase("error");
    }
  }, [leadId, fields, sessionId]);

  const createAttribution = useCallback(async (
    attributionType: string,
    attributedUserId?: string,
    sourceRoleCode?: string,
  ) => {
    if (!sessionId) return;
    try {
      await supabase.from("scanner_session_attributions").insert({
        scanner_session_id: sessionId,
        attribution_type: attributionType,
        attributed_user_id: attributedUserId || user?.id || null,
        source_role_code: sourceRoleCode || "unknown",
        confidence_score: 100,
        resolution_status: "auto_assigned",
      });
    } catch (e: any) {
      console.warn("Attribution creation failed:", e.message);
    }
  }, [sessionId, user]);

  const reset = useCallback(() => {
    setPhase("idle");
    setFields([]);
    setGlobalConfidence(0);
    setImportId(null);
    setLeadId(null);
    setSessionId(null);
    setError(null);
    setProgress(0);
  }, []);

  return {
    phase, fields, globalConfidence, importId, leadId, sessionId, error, progress,
    uploadAndExtract, updateField, verifyField, createLeadFromExtraction, reset,
    startSession, createAttribution,
  };
}
