/**
 * UNPRO — /alex-match
 * ChatGPT-style premium conversation: 5 short questions then route to /results.
 */
import { Helmet } from "react-helmet-async";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { X, ArrowRight, Send, Image as ImageIcon } from "lucide-react";
import UnproLogo from "@/components/brand/UnproLogo";
import AlexOrb from "@/components/alex/AlexOrb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AddressVerifiedInput from "@/components/address/AddressVerifiedInput";
import type { VerifiedAddress } from "@/types/address";
import { emptyAddress, isVerified } from "@/types/address";

type Step = "problem" | "address" | "urgency" | "budget" | "photo" | "done";

interface Msg {
  from: "alex" | "user";
  text: string;
}

const ALEX_QUESTIONS: Record<Step, string> = {
  problem: "Bonjour 👋 Décrivez-moi votre projet ou le problème à régler.",
  address: "Parfait. À quelle adresse ?",
  urgency: "C'est urgent, dans les jours, ou planifié ?",
  budget: "Avez-vous un budget approximatif en tête ?",
  photo: "Une photo aiderait-elle à mieux cibler le bon pro ? (optionnel)",
  done: "Merci. Je cherche les meilleurs pros pour vous…",
};

const URGENCY_OPTIONS = [
  { value: "urgent", label: "Urgent (24-48h)" },
  { value: "week", label: "Cette semaine" },
  { value: "planned", label: "Planifié" },
];

const BUDGET_OPTIONS = [
  { value: "lt1k", label: "< 1 000 $" },
  { value: "1k-5k", label: "1 000 – 5 000 $" },
  { value: "5k-20k", label: "5 000 – 20 000 $" },
  { value: "gt20k", label: "20 000 $ +" },
  { value: "unsure", label: "Je ne sais pas" },
];

export default function PageAlexMatch() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("problem");
  const [messages, setMessages] = useState<Msg[]>([
    { from: "alex", text: ALEX_QUESTIONS.problem },
  ]);
  const [problem, setProblem] = useState("");
  const [address, setAddress] = useState<VerifiedAddress>(emptyAddress());
  const [urgency, setUrgency] = useState<string | null>(null);
  const [budget, setBudget] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, step]);

  const advance = (next: Step, userText: string) => {
    setMessages((prev) => [
      ...prev,
      { from: "user", text: userText },
      { from: "alex", text: ALEX_QUESTIONS[next] },
    ]);
    setStep(next);
  };

  const finish = () => {
    setMessages((prev) => [
      ...prev,
      { from: "alex", text: ALEX_QUESTIONS.done },
    ]);
    setStep("done");
    // Persist payload for /results
    try {
      sessionStorage.setItem(
        "unpro_match_intent",
        JSON.stringify({
          problem,
          address: isVerified(address)
            ? { full: address.fullAddress, city: address.city }
            : null,
          urgency,
          budget,
          ts: Date.now(),
        })
      );
    } catch {}
    setTimeout(() => navigate("/results"), 1200);
  };

  const canSubmitProblem = problem.trim().length >= 4;
  const canSubmitAddress = isVerified(address);

  return (
    <>
      <Helmet>
        <title>UNPRO — Trouver le bon entrepreneur avec Alex</title>
        <meta name="description" content="Décrivez votre besoin à Alex. Recommandation directe et rendez-vous garanti." />
      </Helmet>

      <div
        className="min-h-screen flex flex-col"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 0%, hsl(222 100% 65% / 0.10), transparent 60%), #060B14`,
        }}
      >
        {/* Sticky minimal header */}
        <header className="sticky top-0 z-30 border-b border-white/5 bg-background/60 backdrop-blur-xl">
          <div className="mx-auto max-w-2xl px-4 h-14 flex items-center justify-between">
            <Link to="/" className="flex items-center" aria-label="Accueil">
              <UnproLogo size={100} animated={false} />
            </Link>
            <Link
              to="/"
              aria-label="Quitter"
              className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition"
            >
              <X className="h-5 w-5" />
            </Link>
          </div>
        </header>

        {/* Conversation */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl px-4 py-6 flex flex-col gap-4">
            {step === "problem" && messages.length === 1 && (
              <div className="flex justify-center mb-2">
                <AlexOrb size="sm" />
              </div>
            )}

            {messages.map((m, i) => (
              <MessageBubble key={i} msg={m} />
            ))}

            {/* Inline form for current step */}
            <div className="mt-2">
              {step === "problem" && (
                <InlineForm onSubmit={() => canSubmitProblem && advance("address", problem)} disabled={!canSubmitProblem}>
                  <Input
                    autoFocus
                    placeholder="Ex. Toiture qui coule, rénovation de cuisine…"
                    value={problem}
                    onChange={(e) => setProblem(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && canSubmitProblem) {
                        e.preventDefault();
                        advance("address", problem);
                      }
                    }}
                    className="h-12 bg-white/5 border-white/10 text-base"
                  />
                </InlineForm>
              )}

              {step === "address" && (
                <InlineForm
                  onSubmit={() =>
                    canSubmitAddress &&
                    advance("urgency", isVerified(address) ? address.fullAddress : "Adresse")
                  }
                  disabled={!canSubmitAddress}
                >
                  <AddressVerifiedInput
                    value={address}
                    onChange={setAddress}
                    label=""
                    showUnitField={false}
                    placeholder="Tapez votre adresse…"
                  />
                </InlineForm>
              )}

              {step === "urgency" && (
                <ChipGroup
                  options={URGENCY_OPTIONS}
                  onPick={(opt) => {
                    setUrgency(opt.value);
                    advance("budget", opt.label);
                  }}
                />
              )}

              {step === "budget" && (
                <ChipGroup
                  options={BUDGET_OPTIONS}
                  onPick={(opt) => {
                    setBudget(opt.value);
                    advance("photo", opt.label);
                  }}
                />
              )}

              {step === "photo" && (
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => navigate("/upload-photo")}
                    className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 transition text-left"
                  >
                    <ImageIcon className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">Ajouter une photo</div>
                      <div className="text-xs text-muted-foreground">Diagnostic visuel par IA</div>
                    </div>
                  </button>
                  <Button onClick={finish} size="lg" className="h-12 gap-2">
                    Voir mes recommandations
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <button
                    type="button"
                    onClick={finish}
                    className="text-xs text-muted-foreground hover:text-foreground py-1"
                  >
                    Passer
                  </button>
                </div>
              )}

              {step === "done" && (
                <div className="flex justify-center py-6">
                  <AlexOrb size="md" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- Sub-components ---------- */

function MessageBubble({ msg }: { msg: Msg }) {
  const isAlex = msg.from === "alex";
  return (
    <div className={`flex ${isAlex ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isAlex
            ? "bg-white/5 border border-white/10 text-foreground rounded-tl-sm"
            : "bg-primary text-primary-foreground rounded-tr-sm"
        }`}
      >
        {msg.text}
      </div>
    </div>
  );
}

function InlineForm({
  children,
  onSubmit,
  disabled,
}: {
  children: React.ReactNode;
  onSubmit: () => void;
  disabled?: boolean;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex flex-col gap-3"
    >
      {children}
      <Button type="submit" disabled={disabled} size="lg" className="h-12 gap-2">
        Continuer
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}

function ChipGroup({
  options,
  onPick,
}: {
  options: { value: string; label: string }[];
  onPick: (opt: { value: string; label: string }) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onPick(opt)}
          className="px-4 py-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/40 transition text-sm font-medium"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
