/**
 * visualAnalysisService
 * Client-side helper: send an image to the `visual-analysis` edge function
 * and return findings + annotations + summary for inline rendering in Alex chat.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Annotation, AnnotationSeverity } from "./AIAnnotationLayer";
import type { VisualFinding } from "./VisualConversationPanel";

export interface VisualAnalysisResult {
  summary: string;
  findings: VisualFinding[];
  annotations: Annotation[];
  urgency: AnnotationSeverity;
  recommended_action?: string;
  analysis_id?: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result || "");
      resolve(s.includes(",") ? s.split(",")[1] : s);
    };
    r.onerror = () => reject(new Error("read_failed"));
    r.readAsDataURL(file);
  });
}

export async function analyzeImageVisually(
  file: File,
  ctx?: { propertyId?: string; sessionId?: string; userMessage?: string },
): Promise<VisualAnalysisResult> {
  const base64 = await fileToBase64(file);

  const { data, error } = await supabase.functions.invoke("visual-analysis", {
    body: {
      image_base64: base64,
      mime_type: file.type || "image/jpeg",
      property_id: ctx?.propertyId ?? null,
      session_id: ctx?.sessionId ?? null,
      user_message: ctx?.userMessage ?? "",
    },
  });

  if (error) throw new Error(error.message || "visual_analysis_failed");
  if (!data || data.error) throw new Error(data?.error || "visual_analysis_invalid");

  return {
    summary: String(data.summary ?? ""),
    findings: Array.isArray(data.findings) ? data.findings : [],
    annotations: Array.isArray(data.annotations) ? data.annotations : [],
    urgency: (data.urgency as AnnotationSeverity) ?? "medium",
    recommended_action: data.recommended_action,
    analysis_id: data.analysis_id,
  };
}
