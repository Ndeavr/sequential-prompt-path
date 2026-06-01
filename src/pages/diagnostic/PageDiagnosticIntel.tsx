/**
 * PageDiagnosticIntel — Multimodal AI diagnostic page.
 * Upload image → calls visual-analysis edge function → overlay annotations + chat sidebar.
 *
 * Layout:
 * - Desktop ≥1024px: 2-column grid (canvas 60% / sidebar 40%).
 * - Mobile: stacked (canvas first, sidebar below).
 */
import { useCallback, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Upload } from "lucide-react";
import MainLayout from "@/layouts/MainLayout";
import VisualAnalysisCanvas from "@/components/diagnostic/VisualAnalysisCanvas";
import AnnotationChatSidebar from "@/components/diagnostic/AnnotationChatSidebar";
import type { Annotation } from "@/components/diagnostic/AIAnnotationLayer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AnalysisResult {
  findings: Annotation[];
  risk_score: number;
  urgency_level: "low" | "medium" | "high" | "critical";
  recommended_action: string;
}

function getOrCreateSessionId(): string {
  try {
    const k = "unpro.visual.sessionId";
    let id = localStorage.getItem(k);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(k, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export default function PageDiagnosticIntel() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Format non supporté. Importez une image.");
      return;
    }
    // Local preview
    const localUrl = URL.createObjectURL(file);
    setImageUrl(localUrl);
    setResult(null);
    setLoading(true);

    try {
      // Read as base64 for edge function (small images only; future: upload to storage)
      const b64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.onerror = rej;
        r.readAsDataURL(file);
      });

      const session_id = getOrCreateSessionId();
      const { data, error } = await supabase.functions.invoke("visual-analysis", {
        body: { image_data: b64, session_id },
      });

      if (error) throw error;
      if (!data?.findings) throw new Error("Analyse incomplète");

      setResult({
        findings: data.findings,
        risk_score: data.risk_score ?? 0,
        urgency_level: data.urgency_level ?? "low",
        recommended_action: data.recommended_action ?? "",
      });
    } catch (e: any) {
      // Behavioral kernel: never expose technical errors.
      toast.message("Je n'ai pas pu compléter l'analyse pour le moment.", {
        description: "Réessayez avec une autre image, je continue avec vous.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const onPick = () => fileRef.current?.click();

  return (
    <MainLayout>
      <Helmet>
        <title>Diagnostic visuel IA — UNPRO</title>
        <meta name="description" content="Importez une photo de votre problème maison. Alex identifie risques, urgence et prochaine action." />
        <meta name="robots" content="noindex" />
      </Helmet>

      <section className="px-5 lg:px-10 pt-14 lg:pt-20 pb-6">
        <h1 className="text-[clamp(1.75rem,5vw,2.5rem)] font-semibold tracking-[-0.03em] text-white leading-tight">
          Diagnostic visuel IA
        </h1>
        <p className="mt-2 text-white/55 text-[15px] max-w-[52ch]">
          Importez une photo. Alex annote les zones à risque et vous indique la prochaine étape.
        </p>
      </section>

      <section className="px-5 lg:px-10 pb-24">
        {!imageUrl ? (
          <button
            onClick={onPick}
            className="w-full rounded-[28px] border border-dashed border-white/15
              bg-white/[0.03] hover:bg-white/[0.05] hover:border-white/25
              py-16 lg:py-24 flex flex-col items-center justify-center gap-3
              transition-all duration-300"
          >
            <div className="w-14 h-14 rounded-2xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
              <Upload className="w-6 h-6 text-white/80" strokeWidth={1.6} />
            </div>
            <div className="text-white font-medium">Importer une photo</div>
            <div className="text-white/50 text-sm">JPG, PNG — analyse en quelques secondes</div>
          </button>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5 lg:gap-6">
            <VisualAnalysisCanvas
              imageUrl={imageUrl}
              annotations={result?.findings ?? []}
              loading={loading}
            />
            <AnnotationChatSidebar
              findings={result?.findings ?? []}
              urgency={result?.urgency_level}
              recommendation={result?.recommended_action}
              riskScore={result?.risk_score}
            />
          </div>
        )}

        {imageUrl && (
          <div className="mt-5 flex gap-3">
            <button
              onClick={onPick}
              className="px-5 py-2.5 rounded-[18px] bg-white/[0.05] hover:bg-white/[0.08]
                border border-white/[0.08] text-white text-sm font-medium transition-colors"
            >
              Nouvelle photo
            </button>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = "";
          }}
        />
      </section>
    </MainLayout>
  );
}
