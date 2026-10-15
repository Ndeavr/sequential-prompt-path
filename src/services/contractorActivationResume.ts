import { supabase } from "@/integrations/supabase/client";
import { fetchPricingQuote } from "@/services/contractorPricingQuoteService";
import { peekClaraSessionToken, startOrResumeClaraSession } from "@/services/clara/claraSession";

type ResumeQuote = { id: string; company_name: string | null; pricing_status: string };
const identity = (name: string) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr-CA").replace(/[^a-z0-9]/g, "");

/** A linked contractor alone is not proof of payment. Resume server quotes only. */
export function activationQuoteDestination(quote: ResumeQuote | null, companyName: string | null): string | null {
  if (!quote || !companyName || !quote.company_name || !identity(companyName) || identity(quote.company_name) !== identity(companyName)) return null;
  if (quote.pricing_status === "paid") return "/pro";
  if (["draft", "offered", "accepted", "waitlisted"].includes(quote.pricing_status)) return `/entrepreneur/plan-personnalise/${encodeURIComponent(quote.id)}`;
  return null;
}

export async function resumeContractorActivation(companyName: string | null): Promise<string | null> {
  if (!companyName) return null;
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError && authError.name !== "AuthSessionMissingError") throw authError;
  if (auth.user) {
    const { data, error } = await supabase.from("contractor_pricing_quotes")
      .select("id, company_name, pricing_status")
      .eq("user_id", auth.user.id).order("created_at", { ascending: false });
    if (error) throw error;
    // Match this company, never another business belonging to the same account.
    // A newer unpaid estimate must never hide an already confirmed activation.
    const paid = (data ?? []).find(quote => quote.pricing_status === "paid" && activationQuoteDestination(quote, companyName));
    if (paid) return "/pro";
    for (const quote of data ?? []) {
      const destination = activationQuoteDestination(quote, companyName);
      if (destination) return destination;
    }
  }
  // Guest quotes are referenced by the canonical Clara conversation, not a
  // second local copy. The quote endpoint revalidates access before resuming.
  if (!peekClaraSessionToken()) return null;
  const session = await startOrResumeClaraSession({ entrypoint: "contractor_activation_resume" });
  const quoteId = session.context.pricing_quote_id;
  if (typeof quoteId !== "string") return null;
  const quote = await fetchPricingQuote(quoteId);
  // Guest state must never send an unauthenticated visitor to the dashboard.
  if (quote?.pricing_status === "paid" && !auth.user) return null;
  return activationQuoteDestination(quote, companyName);
}
