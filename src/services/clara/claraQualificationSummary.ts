import { peekClaraSessionToken } from "./claraSession";
import { supabase } from "@/integrations/supabase/client";
import { getClaraQualification, saveClaraQualification } from "./claraContractorQualification";
import { sanitizeQualificationSummary } from "../../../supabase/functions/_shared/claraQualificationSummary";

/** Use the existing chat gateway and canonical workflow; never another profile. */
export async function captureClaraContractorAnswer(answer: string, question = "") {
  const snapshot = getClaraQualification();
  const sessionToken = peekClaraSessionToken();
  const { data, error } = await supabase.functions.invoke("alex-chat", {
    body: { action: "summarize_contractor_answer", answer, question, known: snapshot },
  });
  if (error || !data?.patch) throw new Error("Clara n’a pas pu résumer cette réponse. Vos critères sont conservés; réessayez.");
  if (peekClaraSessionToken() !== sessionToken) throw new Error("La conversation a changé; la réponse précédente n’a pas été appliquée.");
  const patch = sanitizeQualificationSummary(data.patch);
  const current = getClaraQualification();
  // A manual correction made while waiting always wins.
  for (const key of Object.keys(patch) as (keyof typeof patch)[]) {
    if (JSON.stringify(current[key]) !== JSON.stringify(snapshot[key])) delete patch[key];
  }
  saveClaraQualification(patch, "declared", { replaceLists: true });
  return { patch, clarification: typeof data.clarification === "string" ? data.clarification : null };
}
