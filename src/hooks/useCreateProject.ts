/**
 * useCreateProject — unified project creation used by all 3 entry methods
 * (Alex voice, Alex chat, manual form). Guarantees:
 *   • project insert never blocked by demand_signal insert failure
 *   • navigates to /project-created with the new project id
 *   • returns match presence flag so the success page routes correctly
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export interface CreateProjectInput {
  description: string;
  category?: string;
  city?: string;
  postal_code?: string;
  photos?: string[];
  source?: "alex_voice" | "alex_chat" | "manual" | "upload";
}

export interface CreateProjectResult {
  projectId: string;
  hasMatches: boolean;
}

export function useCreateProject() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createProject(input: CreateProjectInput): Promise<CreateProjectResult | null> {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "create-project-unified",
        { body: input },
      );
      if (fnError) throw fnError;
      const result = data as CreateProjectResult;
      navigate(
        `/project-created?id=${encodeURIComponent(result.projectId)}${
          result.hasMatches ? "&matches=1" : ""
        }`,
      );
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { createProject, loading, error };
}
