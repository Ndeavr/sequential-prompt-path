/**
 * Clara — repli budgétaire du forfait de rendez-vous, sur la page du plan.
 * Même tunnel, même Clara : une seule question, budget libre, recalcul serveur
 * (mode budget), réponse construite uniquement à partir du devis retourné.
 */
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchPricingQuote, type PricingQuote } from "@/services/contractorPricingQuoteService";
import { trackFunnelStep } from "@/lib/analytics/funnelSteps";
import {
  BUDGET_QUESTION, budgetFallbackRequest, budgetOfferAnswer, isBudgetHesitation, parseMonthlyBudget, readBudgetOffer,
} from "@/lib/pricing/budgetFallback";

type Turn = { from: "clara" | "pro"; text: string };

export function ClaraBudgetFallback({ quote, initialTarget, onQuote, onPresence }: {
  quote: PricingQuote;
  initialTarget: number | null;
  onQuote: (q: PricingQuote) => void;
  onPresence: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [insufficient, setInsufficient] = useState(false);

  const ask = (userText?: string) => {
    setOpen(true);
    setTurns((t) => [...t, ...(userText ? [{ from: "pro" as const, text: userText }] : []), { from: "clara", text: BUDGET_QUESTION }]);
    void trackFunnelStep("plan_presented", { subjectId: quote.id, metadata: { surface: "plan_clara_budget", step: "budget_question" } });
  };

  const submit = async () => {
    const text = draft.trim();
    if (!text || busy) return;
    const budget = parseMonthlyBudget(text);
    if (budget === null) {
      setDraft("");
      if (isBudgetHesitation(text) && !open) return ask(text);
      setTurns((t) => [...t, { from: "pro", text }, { from: "clara", text: "Indiquez un seul montant par mois, par exemple 250 $. Je calcule ce qui est réellement inclus." }]);
      return;
    }
    setDraft("");
    setBusy(true);
    setInsufficient(false);
    setTurns((t) => [...t, { from: "pro", text }]);
    try {
      const { data, error } = await supabase.functions.invoke("compute-pricing-quote", { body: budgetFallbackRequest(quote, budget) });
      const newId = (data as { quote_id?: string } | null)?.quote_id;
      if (error || !newId) throw new Error("quote");
      const q = await fetchPricingQuote(newId);
      if (!q) throw new Error("quote");
      const offer = readBudgetOffer(q, budget);
      setTurns((t) => [...t, { from: "clara", text: budgetOfferAnswer(offer, initialTarget) }]);
      setInsufficient(offer.kind === "insufficient");
      void trackFunnelStep("plan_presented", { subjectId: q.id, metadata: { surface: "plan_clara_budget", step: "budget_offer", outcome: offer.kind, monthly_budget_cents: Math.round(budget * 100) } });
      onQuote(q);
    } catch {
      setTurns((t) => [...t, { from: "clara", text: "Je n'ai pas pu recalculer l'offre pour ce budget. Votre montant est conservé ici; réessayez dans un instant." }]);
      setDraft(text);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 mb-4" data-testid="clara-budget-fallback" aria-labelledby="clara-budget-title">
      <h2 id="clara-budget-title" className="text-base font-semibold">Pas certain? Commencez à votre rythme.</h2>
      {!open && (
        <div className="mt-3 flex flex-wrap gap-2">
          {["C'est trop cher pour moi", "Je veux commencer petit", "Je ne suis pas certain"].map((label) => (
            <button key={label} type="button" onClick={() => ask(label)} data-testid="budget-hesitation-chip"
              className="min-h-11 rounded-full border border-white/20 bg-white/5 px-4 text-sm text-white">{label}</button>
          ))}
        </div>
      )}
      {open && (
        <div className="mt-3 space-y-2" aria-live="polite" data-testid="clara-budget-thread">
          {turns.map((t, i) => (
            <p key={i} className={t.from === "clara" ? "rounded-2xl bg-white/[0.06] px-4 py-3 text-sm text-white/90" : "ml-auto w-fit max-w-[85%] rounded-2xl bg-amber-500/15 px-4 py-2 text-sm text-amber-50"}>
              {t.from === "clara" && <span className="mb-1 block text-[11px] uppercase tracking-wider text-white/60">Clara</span>}
              {t.text}
            </p>
          ))}
          <form className="flex items-center gap-2 pt-1" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
            <label htmlFor="clara-budget-input" className="sr-only">Budget mensuel</label>
            <input id="clara-budget-input" data-testid="clara-budget-input" inputMode="decimal" enterKeyHint="send" autoComplete="off" value={draft}
              onChange={(e) => setDraft(e.target.value)} placeholder="Ex. 250 $ par mois"
              className="min-h-12 w-full rounded-xl border border-white/25 bg-white/[0.06] px-4 text-[16px] text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-amber-400" />
            <button type="submit" disabled={busy || !draft.trim()} data-testid="clara-budget-submit"
              className="min-h-12 shrink-0 rounded-[18px] bg-amber-500 px-4 text-sm font-semibold text-black disabled:opacity-70">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-label="Calcul en cours" /> : "Calculer"}
            </button>
          </form>
          {insufficient && (
            <button type="button" onClick={onPresence} data-testid="budget-presence-only" className="w-full min-h-12 rounded-[18px] border border-amber-400/60 px-4 text-sm font-semibold text-amber-100">
              Présence IA seule — 350 $ + taxes, paiement unique
            </button>
          )}
        </div>
      )}
    </section>
  );
}
