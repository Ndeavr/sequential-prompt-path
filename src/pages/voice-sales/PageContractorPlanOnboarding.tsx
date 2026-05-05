import { useState, useRef, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic, Send, Sparkles } from "lucide-react";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { usePlanCatalog, useLeadPacks, useVoiceSalesChat } from "@/hooks/useVoiceSales";
import CardPlanRegular from "@/components/voice-sales/CardPlanRegular";
import CardPlanFounders from "@/components/voice-sales/CardPlanFounders";
import ModalHeyButWaitUpgrade from "@/components/voice-sales/ModalHeyButWaitUpgrade";
import PanelLeadPackSelector from "@/components/voice-sales/PanelLeadPackSelector";
import PanelInlineCheckout from "@/components/voice-sales/PanelInlineCheckout";
import PanelPlanFitCheck from "@/components/voice-sales/PanelPlanFitCheck";

type FlowPhase = "chat" | "plans" | "fit_check" | "founders_upsell" | "lead_packs" | "checkout";

export default function PageContractorPlanOnboarding() {
  const { openAlex } = useAlexVoice();
  const { data: plans } = usePlanCatalog();
  const { data: leadPacks } = useLeadPacks();
  const { messages, isStreaming, sendMessage } = useVoiceSalesChat();

  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<FlowPhase>("chat");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<"regular" | "founders">("regular");
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [showFoundersModal, setShowFoundersModal] = useState(false);
  const [sessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedPlan = plans?.find((p: any) => p.id === selectedPlanId);
  const selectedPack = leadPacks?.find((p: any) => p.id === selectedPackId);

  const [searchParams] = useSearchParams();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, phase]);

  // Preselect plan from URL (?plan=pro&validate=1) → jump to fit_check
  useEffect(() => {
    if (!plans || selectedPlanId) return;
    const code = searchParams.get("plan");
    const validate = searchParams.get("validate");
    if (!code) return;
    const found = plans.find((p: any) => p.code === code);
    if (!found) return;
    setSelectedPlanId(found.id);
    if (validate === "1") setPhase("fit_check");
    else setPhase("lead_packs");
  }, [plans, searchParams, selectedPlanId]);

  const handleFitCheckConfirm = (finalCode: string) => {
    const finalPlan = plans?.find((p: any) => p.code === finalCode);
    if (finalPlan) {
      setSelectedPlanId(finalPlan.id);
      if (finalPlan.code === "elite" || finalPlan.code === "signature") {
        setShowFoundersModal(true);
      } else {
        setSelectedVariant("regular");
        setPhase("lead_packs");
      }
    }
  };

  const handleSend = useCallback(() => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim());
    setInput("");
  }, [input, isStreaming, sendMessage]);

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = plans?.find((p: any) => p.id === planId);
    // Show Founders upsell for Élite/Signature
    if (plan && (plan.code === "elite" || plan.code === "signature")) {
      setShowFoundersModal(true);
    } else {
      setSelectedVariant("regular");
      setPhase("lead_packs");
    }
  };

  const handleFoundersAccept = () => {
    setSelectedVariant("founders");
    setShowFoundersModal(false);
    setPhase("lead_packs");
  };

  const handleFoundersDecline = () => {
    setSelectedVariant("regular");
    setShowFoundersModal(false);
    setPhase("lead_packs");
  };

  const handleShowPlans = () => setPhase("plans");
  const handleProceedToCheckout = () => setPhase("checkout");

  return (
    <>
      <Helmet>
        <title>Choisir mon plan — UNPRO</title>
        <meta name="description" content="Parlez à Alex pour trouver le plan parfait pour votre entreprise. Rendez-vous qualifiés, pas des leads partagés." />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="border-b px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold">Alex — Conseiller UNPRO</h1>
            <p className="text-xs text-muted-foreground">
              {phase === "chat" ? "Qualification en cours…" : phase === "plans" ? "Choix du plan" : phase === "fit_check" ? "Validation du plan" : phase === "checkout" ? "Paiement" : "Configuration"}
            </p>
          </div>
          {phase === "chat" && (
            <Button variant="outline" size="sm" className="ml-auto text-xs" onClick={handleShowPlans}>
              Voir les plans
            </Button>
          )}
        </div>

        {/* Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Chat messages */}
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted rounded-bl-md"
              }`}>
                {msg.content}
              </div>
            </motion.div>
          ))}

          {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2.5">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse" />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse delay-100" />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse delay-200" />
                </div>
              </div>
            </div>
          )}

          {/* Plans phase */}
          <AnimatePresence>
            {phase === "plans" && plans && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 pb-4">
                <h2 className="text-sm font-bold text-center">Choisissez votre plan</h2>
                {plans.map((plan: any) => (
                  <CardPlanRegular
                    key={plan.id}
                    plan={plan}
                    recommended={plan.highlighted}
                    onSelect={handleSelectPlan}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Fit check phase */}
          <AnimatePresence>
            {phase === "fit_check" && selectedPlan && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-4">
                <PanelPlanFitCheck
                  selectedPlanCode={selectedPlan.code}
                  onConfirm={handleFitCheckConfirm}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Lead packs phase */}
          <AnimatePresence>
            {phase === "lead_packs" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 pb-4">
                <PanelLeadPackSelector selectedPackId={selectedPackId} onSelect={setSelectedPackId} />
                <Button onClick={handleProceedToCheckout} className="w-full">
                  Continuer vers le paiement
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Checkout phase */}
          <AnimatePresence>
            {phase === "checkout" && selectedPlan && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-4">
                <PanelInlineCheckout
                  planName={selectedPlan.name}
                  planPrice={selectedPlan.monthly_price}
                  leadPackPrice={selectedPack?.pack_price}
                  variant={selectedVariant}
                  sessionId={sessionId}
                  planId={selectedPlan.id}
                  leadPackId={selectedPackId}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input bar */}
        {phase === "chat" && (
          <div className="border-t p-3 safe-area-bottom">
            <div className="flex gap-2 max-w-lg mx-auto">
              <Button variant="outline" size="icon" className="shrink-0" onClick={() => openAlex("contractor_onboarding")}>
                <Mic className="w-4 h-4" />
              </Button>
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSend()}
                placeholder="Répondez à Alex…"
                className="flex-1"
                disabled={isStreaming}
              />
              <Button size="icon" onClick={handleSend} disabled={isStreaming || !input.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Founders upsell modal */}
        {selectedPlan && (
          <ModalHeyButWaitUpgrade
            open={showFoundersModal}
            onClose={handleFoundersDecline}
            planName={selectedPlan.name}
            foundersPrice={Math.round(selectedPlan.monthly_price * 0.8)}
            regularPrice={selectedPlan.monthly_price}
            onAccept={handleFoundersAccept}
          />
        )}
      </div>
    </>
  );
}
