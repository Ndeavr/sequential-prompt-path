/**
 * UNPRO — useDocumentAnalyzer Hook
 * Upload documents, extract identity clues, and connect to verification engine.
 */

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DocumentAnalysisResult, AnalyzableDocType } from "@/types/documentExtraction";
import { toast } from "sonner";

interface AnalyzeDocumentInput {
  fileBase64: string;
  fileName: string;
  contractorId?: string;
  verificationRunId?: string;
}

export function useDocumentAnalyzer() {
  const [result, setResult] = useState<DocumentAnalysisResult | null>(null);

  const mutation = useMutation({
    mutationFn: async (input: AnalyzeDocumentInput): Promise<DocumentAnalysisResult> => {
      const { data, error } = await supabase.functions.invoke("extract-document-identity", {
        body: {
          file_base64: input.fileBase64,
          file_name: input.fileName,
          contractor_id: input.contractorId || null,
          verification_run_id: input.verificationRunId || null,
        },
      });

      if (error) throw new Error(error.message || "Erreur d'analyse");
      if (!data?.success) throw new Error(data?.error || "Extraction échouée");

      return data as DocumentAnalysisResult;
    },
    onSuccess: (data) => {
      setResult(data);
      const clueCount = data.identity_clues_found?.length ?? 0;
      if (clueCount >= 3) {
        toast.success("Indices d'identification trouvés dans le document.");
      } else if (clueCount > 0) {
        toast.info("Quelques indices trouvés. D'autres documents pourraient aider.");
      } else {
        toast.warning("Aucun indice d'identification clair n'a été trouvé.");
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erreur lors de l'analyse du document.");
    },
  });

  const analyzeDocument = (file: File, contractorId?: string, verificationRunId?: string) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      mutation.mutate({
        fileBase64: base64,
        fileName: file.name,
        contractorId,
        verificationRunId,
      });
    };
    reader.readAsDataURL(file);
  };

  const reset = () => {
    setResult(null);
    mutation.reset();
  };

  return {
    analyzeDocument,
    result,
    isAnalyzing: mutation.isPending,
    error: mutation.error,
    reset,
  };
}
