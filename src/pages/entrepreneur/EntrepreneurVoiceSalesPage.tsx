/**
 * EntrepreneurVoiceSalesPage — Full-screen Alex sales closer for entrepreneurs.
 */
import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, Mic, X, ArrowRight, CreditCard } from "lucide-react";
import { useAlexSalesSession, type SalesMessage } from "@/hooks/useAlexSalesSession";
import { AlexRevenueProjectionCard } from "@/components/alex/AlexRevenueProjectionCard";
import { AlexPlanSelectorDial } from "@/components/alex/AlexPlanSelectorDial";
import { getAllPlans, type PlanTier } from "@/services/alexEntrepreneurGuidanceEngine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";

export default function EntrepreneurVoiceSalesPage() {
  const navigate = useNavigate();
  const { openAlex } = useAlexVoice();
  const [lang] = useState<"fr" | "en">("fr");
  const [input, setInput] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<PlanTier | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    sessionId, step, messages, projection, planRec,
    objection, isLoading, uiActions, startSession, sendMessage,
  } = useAlexSalesSession(lang);

  useEffect(() => {
    startSession();
  }, [startSession]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput("");
  }, [input, isLoading, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  const projectionData = projection ? {
    annualTarget: projection.target_revenue,
    avgProjectValue: projection.avg_job_value,
    estimatedMarginPct: 30,
    rdvNeededAnnual: projection.rdv_annual,
    rdvNeededMonthly: projection.rdv_monthly,
    recommendedPlan: projection.recommended_plan,
  } : null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center"
            animate={{ scale: isLoading ? [1, 1.08, 1] : 1 }}
            transition={{ duration: 1.2, repeat: isLoading ? Infinity : 0 }}
          >
            <Bot className="w-5 h-5 text-primary" />
          </motion.div>
          <div>
            <p className="text-sm font-semibold text-foreground">Alex</p>
            <p className="text-[10px] text-muted-foreground">
              {isLoading ? (lang === "fr" ? "Analyse en cours…" : "Analyzing…") : (lang === "fr" ? "Conseiller UNPRO" : "UNPRO Advisor")}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.sender === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted text-foreground rounded-bl-md"
              }`}>
                {msg.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Inline projection card */}
        {projectionData && uiActions.includes("show_projection") && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <AlexRevenueProjectionCard projection={projectionData} />
          </motion.div>
        )}

        {/* Inline plan selector */}
        {planRec && (uiActions.includes("show_plan") || uiActions.includes("show_plan_selector")) && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <AlexPlanSelectorDial
              recommendedPlan={(planRec.plan as PlanTier) || "pro"}
              selectedPlan={selectedPlan}
              onSelect={setSelectedPlan}
            />
          </motion.div>
        )}

        {/* Checkout CTA */}
        {(step === "checkout_ready" || selectedPlan) && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pt-2">
            <Button
              className="w-full gap-2"
              size="lg"
              onClick={() => navigate(`/checkout?plan=${selectedPlan || planRec?.plan || "pro"}`)}
            >
              <CreditCard className="w-4 h-4" />
              {lang === "fr" ? "Activer mon plan" : "Activate my plan"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        )}

        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex gap-1">
              {[0, 1, 2].map(i => (
                <motion.div key={i} className="w-2 h-2 rounded-full bg-muted-foreground/40"
                  animate={{ scale: [1, 1.4, 1] }}
                  transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Quick replies */}
      {step === "greeting" && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
          {(lang === "fr"
            ? ["Je veux plus de clients", "Combien ça coûte ?", "Je suis entrepreneur"]
            : ["I want more clients", "How much is it?", "I'm a contractor"]
          ).map(chip => (
            <button key={chip} onClick={() => sendMessage(chip)}
              className="shrink-0 px-3 py-1.5 rounded-full border border-border bg-card text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="shrink-0" onClick={() => openAlex("sales")}>
            <Mic className="w-4 h-4" />
          </Button>
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={lang === "fr" ? "Écrivez votre message…" : "Type your message…"}
            className="flex-1"
            disabled={isLoading}
          />
          <Button size="icon" onClick={handleSend} disabled={isLoading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
