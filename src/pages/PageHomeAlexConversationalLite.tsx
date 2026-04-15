/**
 * PageHomeAlexConversationalLite — V8: Intent-Aware + Desktop Centered + Account Prompt
 * 
 * - Reads ?intent=, ?label=, ?q= from URL to pre-fill context
 * - Shows BannerIntentDetected with detected service + city
 * - After first useful exchange, shows CardAccountPromptInline for guests
 * - Desktop: centered max-w-3xl layout, premium spacing
 * - Mobile: full-screen chat as before
 */
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useSearchParams } from "react-router-dom";
import { useAlexConversationLite } from "@/hooks/useAlexConversationLite";
import { useAlexVoiceLockedStore } from "@/stores/alexVoiceLockedStore";
import { audioEngine } from "@/services/audioEngineUNPRO";
import { detectIntentAndLocation, buildAlexOpening, POPULAR_SEARCH_INTENTS } from "@/services/intentLocationDetector";
import HeroSectionAlexOrbLite from "@/components/alex-conversation/HeroSectionAlexOrbLite";
import InputAlexDockExpanded from "@/components/alex-conversation/InputAlexDockExpanded";
import BubbleAlexMessage from "@/components/alex-conversation/BubbleAlexMessage";
import BubbleUserMessage from "@/components/alex-conversation/BubbleUserMessage";
import LoaderAlexThinking from "@/components/alex-conversation/LoaderAlexThinking";
import BannerIntentDetected from "@/components/alex-conversation/BannerIntentDetected";
import CardAccountPromptInline from "@/components/alex-conversation/CardAccountPromptInline";
import CardEntrepreneurInline from "@/components/alex-conversation/CardEntrepreneurInline";
import CardAvailabilitySlot from "@/components/alex-conversation/CardAvailabilitySlot";
import CardUrgencyAction from "@/components/alex-conversation/CardUrgencyAction";
import CardProjectSuggestion from "@/components/alex-conversation/CardProjectSuggestion";
import CardLoginPromptInline from "@/components/alex-conversation/CardLoginPromptInline";
import CardNoMatchFallback from "@/components/alex-conversation/CardNoMatchFallback";
import CardBusinessAnalysisScore from "@/components/alex-conversation/CardBusinessAnalysisScore";
import CardQuoteAnalysisBreakdown from "@/components/alex-conversation/CardQuoteAnalysisBreakdown";
import CardPhotoDesignSuggestions from "@/components/alex-conversation/CardPhotoDesignSuggestions";
import CardPhotoProblemDiagnosis from "@/components/alex-conversation/CardPhotoProblemDiagnosis";
import CardAIPPScore from "@/components/alex-conversation/CardAIPPScore";
import CardImprovementActions from "@/components/alex-conversation/CardImprovementActions";
import CardAlexProblemSummary from "@/components/alex-conversation/CardAlexProblemSummary";
import CardAlexProfileCompletionRequired from "@/components/alex-conversation/CardAlexProfileCompletionRequired";
import CardAlexAddressRequired from "@/components/alex-conversation/CardAlexAddressRequired";
import CardAlexBookingNextStep from "@/components/alex-conversation/CardAlexBookingNextStep";
import WidgetUploadInline from "@/components/alex-conversation/WidgetUploadInline";
import SheetEntrepreneurDetails from "@/components/alex-conversation/SheetEntrepreneurDetails";
import SheetBookingSlots from "@/components/alex-conversation/SheetBookingSlots";
import PanelAlexInlineFormRenderer from "@/components/alex-conversation/PanelAlexInlineFormRenderer";
import PanelAlexContractorPicker from "@/components/alex-conversation/PanelAlexContractorPicker";
import PanelAlexBookingScheduler from "@/components/alex-conversation/PanelAlexBookingScheduler";
import PanelAlexCheckoutEmbedded from "@/components/alex-conversation/PanelAlexCheckoutEmbedded";
import PanelAlexBeforeAfterStudio from "@/components/alex-conversation/PanelAlexBeforeAfterStudio";
import PanelAlexInlineImageGallery from "@/components/alex-conversation/PanelAlexInlineImageGallery";
import PanelAlexNextBestActionCard from "@/components/alex-conversation/PanelAlexNextBestActionCard";
import PanelAlexLiveTaskStack from "@/components/alex-conversation/PanelAlexLiveTaskStack";
import CardAlexAddressConfirmation from "@/components/alex-conversation/CardAlexAddressConfirmation";
import PanelAlexFormAutoFillPreview from "@/components/alex-conversation/PanelAlexFormAutoFillPreview";
import { MOCK_SLOTS, type MockContractor, type MockSlot } from "@/components/alex-conversation/types";
import { toast } from "sonner";

export default function PageHomeAlexConversationalLite() {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const firstName = user?.user_metadata?.first_name || user?.user_metadata?.name?.split(" ")[0];
  const {
    messages, isThinking, sendMessage, initialize, handleFileUpload,
    flowState, updateAuthState,
  } = useAlexConversationLite(firstName, isAuthenticated, false);

  const voiceStore = useAlexVoiceLockedStore();
  const voiceIsActive = voiceStore.isOverlayOpen;
  const voiceIsConnecting = voiceStore.machineState === "stabilizing" || voiceStore.machineState === "opening_session" || voiceStore.machineState === "requesting_permission";
  const voiceIsSpeaking = voiceStore.machineState === "speaking";

  const scrollRef = useRef<HTMLDivElement>(null);
  const initRef = useRef(false);
  const intentInjectedRef = useRef(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string>();
  const prevAuthRef = useRef(isAuthenticated);
  const [accountPromptDismissed, setAccountPromptDismissed] = useState(false);

  const [detailContractor, setDetailContractor] = useState<MockContractor | null>(null);
  const [bookingContractor, setBookingContractor] = useState<MockContractor | null>(null);

  // ── Intent detection from URL params ──
  const urlIntent = searchParams.get("intent");
  const urlLabel = searchParams.get("label");
  const urlQuery = searchParams.get("q");

  const detectedContext = useMemo(() => {
    // Check popular search intent first
    if (urlIntent) {
      const popular = POPULAR_SEARCH_INTENTS.find(p => p.key === urlIntent);
      if (popular) {
        return {
          intentKey: popular.key,
          intentLabel: urlLabel || popular.label,
          openingPhrase: popular.openingFr,
          city: null as string | null,
        };
      }
    }
    // Check free-text query
    if (urlQuery) {
      const detection = detectIntentAndLocation(urlQuery);
      return {
        intentKey: detection.intentKey,
        intentLabel: detection.intentLabel || urlLabel,
        openingPhrase: detection.openingPhrase ? buildAlexOpening(detection) : null,
        city: detection.city,
      };
    }
    return null;
  }, [urlIntent, urlLabel, urlQuery]);

  // ── Account prompt logic ──
  const userMessageCount = messages.filter(m => m.role === "user").length;
  const alexMessageCount = messages.filter(m => m.role === "alex").length;
  const shouldShowAccountPrompt = !isAuthenticated
    && !accountPromptDismissed
    && userMessageCount >= 1
    && alexMessageCount >= 1
    && detectedContext?.intentKey;

  // GUARD: single initialization
  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      audioEngine.unlock();
      initialize();
    }
  }, [initialize]);

  // ── Inject intent context as first Alex message ──
  useEffect(() => {
    if (intentInjectedRef.current) return;
    if (!detectedContext) return;
    if (messages.length > 0) return; // Already has messages
    if (!initRef.current) return;

    intentInjectedRef.current = true;

    // Give a short delay for initialization to complete
    const timer = setTimeout(() => {
      const opening = detectedContext.openingPhrase || `Je vois que vous avez besoin d'aide avec : ${detectedContext.intentLabel}.`;
      // Send the opening as if the user described their need, then Alex responds contextually
      if (urlQuery) {
        sendMessage(urlQuery);
      } else if (detectedContext.intentLabel) {
        sendMessage(detectedContext.intentLabel);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [detectedContext, messages.length, sendMessage, urlQuery]);

  // GUARD: detect auth change
  useEffect(() => {
    if (isAuthenticated && !prevAuthRef.current) {
      updateAuthState(true, firstName);
    }
    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated, firstName, updateAuthState]);

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
    }
  }, [messages, isThinking, shouldShowAccountPrompt]);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      requestAnimationFrame(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
    };
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  const handleMicToggle = useCallback(() => {
    if (voiceStore.isOverlayOpen) {
      voiceStore.closeVoiceSession("user_mic_toggle");
    } else {
      audioEngine.unlock();
      voiceStore.openVoiceSession("conversation", "mic_button");
    }
  }, [voiceStore]);

  // Auto-start voice on /alex/voice
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if ((location.pathname === "/alex/voice") && !autoStartedRef.current && !voiceStore.isOverlayOpen) {
      autoStartedRef.current = true;
      setTimeout(() => voiceStore.openVoiceSession("conversation", "auto_start_voice_route"), 500);
    }
  }, [location.pathname]);

  const handleSlotSelect = useCallback((slot: MockSlot) => {
    setSelectedSlotId(slot.id);
  }, []);

  const handleBookingConfirm = useCallback((slot: MockSlot) => {
    if (!isAuthenticated) {
      toast.info("Connectez-vous pour confirmer votre rendez-vous.");
      setBookingContractor(null);
      return;
    }
    audioEngine.play("success");
    toast.success(`Rendez-vous confirmé : ${slot.label}`);
    setBookingContractor(null);
  }, [isAuthenticated]);

  // ─── CARD RENDERER ───
  const renderCard = (msg: typeof messages[0]) => {
    switch (msg.cardType) {
      case "problem_summary":
        return <CardAlexProblemSummary problemType={msg.cardData?.problemType} projectType={msg.cardData?.projectType} urgency={msg.cardData?.urgency} summary={msg.cardData?.summary} />;
      case "profile_completion":
        return <CardAlexProfileCompletionRequired missingFields={flowState.userContext.missingFields} completionPercent={60} />;
      case "address_required":
        return <CardAlexAddressRequired reason="Votre adresse permet de trouver les meilleurs entrepreneurs dans votre secteur." onAddAddress={() => sendMessage("Montréal")} />;
      case "entrepreneur":
        return (
          <div className="space-y-2">
            <CardEntrepreneurInline contractor={msg.cardData} onViewProfile={() => setDetailContractor(msg.cardData)} onViewSlots={() => setBookingContractor(msg.cardData)} />
            <CardAlexBookingNextStep contractorName={msg.cardData?.name} specialty={msg.cardData?.specialty} score={msg.cardData?.score} nextSlotLabel="Lun 14 avr · 9h" onBook={() => setBookingContractor(msg.cardData)} />
          </div>
        );
      case "availability":
        return <CardAvailabilitySlot slots={MOCK_SLOTS} selectedId={selectedSlotId} onSelect={handleSlotSelect} />;
      case "urgency": return <CardUrgencyAction />;
      case "project_suggestion": return <CardProjectSuggestion />;
      case "login_prompt": return <CardLoginPromptInline />;
      case "no_match": return <CardNoMatchFallback />;
      case "business_analysis": return <CardBusinessAnalysisScore data={msg.cardData} />;
      case "quote_analysis": return <CardQuoteAnalysisBreakdown data={msg.cardData} />;
      case "photo_design": return <CardPhotoDesignSuggestions data={msg.cardData} />;
      case "photo_problem": return <CardPhotoProblemDiagnosis data={msg.cardData} onFindPro={() => sendMessage("Trouvez-moi un professionnel")} />;
      case "aipp_score": return <CardAIPPScore entityName={msg.cardData?.entityName} score={msg.cardData?.score} tier={msg.cardData?.tier} />;
      case "improvement_actions": return <CardImprovementActions actions={msg.cardData || []} />;
      case "upload_photo": return <WidgetUploadInline type="photo" onFileSelected={(f) => handleFileUpload(f, "photo")} />;
      case "upload_quote": return <WidgetUploadInline type="quote" onFileSelected={(f) => handleFileUpload(f, "quote")} />;
      case "inline_form":
        return <PanelAlexInlineFormRenderer data={msg.cardData} onSubmit={(vals) => sendMessage(`Formulaire soumis: ${JSON.stringify(vals)}`)} />;
      case "contractor_picker":
        return <PanelAlexContractorPicker data={msg.cardData} onSelect={(c) => setDetailContractor(c)} onViewProfile={(c) => setDetailContractor(c)} />;
      case "booking_scheduler":
        return <PanelAlexBookingScheduler data={msg.cardData} onConfirm={(slot) => { audioEngine.play("success"); toast.success(`Rendez-vous confirmé : ${slot.label}`); }} />;
      case "checkout_embedded":
        return <PanelAlexCheckoutEmbedded data={msg.cardData} onCheckout={() => { window.location.href = `/checkout/native/${msg.cardData?.planCode}`; }} />;
      case "before_after":
        return <PanelAlexBeforeAfterStudio data={msg.cardData} onRegenerate={() => sendMessage("Régénérer l'avant/après")} />;
      case "image_gallery":
        return <PanelAlexInlineImageGallery data={msg.cardData} />;
      case "next_best_action":
        return <PanelAlexNextBestActionCard data={msg.cardData} onAccept={(key) => sendMessage(msg.cardData?.label || key)} />;
      case "task_progress":
        return <PanelAlexLiveTaskStack data={msg.cardData} />;
      case "address_confirmation":
        return <CardAlexAddressConfirmation data={msg.cardData} onConfirm={() => sendMessage("Adresse confirmée")} onEdit={(addr) => sendMessage(`Nouvelle adresse: ${addr}`)} />;
      case "form_autofill_preview":
        return <PanelAlexFormAutoFillPreview data={msg.cardData} onConfirm={() => sendMessage("Données confirmées")} onEdit={() => sendMessage("Je veux modifier mes informations")} />;
      default: return null;
    }
  };

  const isVoiceSpeaking = voiceIsActive && voiceIsSpeaking;
  const isVoiceListening = voiceIsActive && !voiceIsSpeaking && voiceStore.machineState === "listening";

  return (
    <div className="flex flex-col h-[100dvh] bg-background relative overflow-hidden">
      {/* Ambient glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, hsl(var(--primary) / 0.05) 0%, transparent 70%)",
          filter: "blur(50px)",
        }}
      />

      {/* Compact Header */}
      <HeroSectionAlexOrbLite
        isListening={isVoiceListening}
        isSpeaking={isVoiceSpeaking}
        isThinking={isThinking}
      />

      {/* Intent Detection Banner */}
      {detectedContext && (
        <BannerIntentDetected
          intentLabel={detectedContext.intentLabel}
          city={detectedContext.city}
        />
      )}

      {/* Conversation Canvas — centered on desktop */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 pb-3 pt-3 space-y-3 scroll-smooth"
        style={{ scrollbarWidth: "none" }}
      >
        {/* Desktop centering wrapper */}
        <div className="max-w-3xl mx-auto w-full">
          <AnimatePresence mode="popLayout">
            {messages.map(msg => (
              <div key={msg.id} className="space-y-2 mb-3">
                {msg.role === "alex" && msg.content && <BubbleAlexMessage content={msg.content} />}
                {msg.role === "user" && <BubbleUserMessage content={msg.content} />}
                {msg.cardType && renderCard(msg)}
              </div>
            ))}
          </AnimatePresence>

          {isThinking && <LoaderAlexThinking />}

          {/* Account prompt after first useful exchange */}
          {shouldShowAccountPrompt && (
            <div className="my-4">
              <CardAccountPromptInline
                onContinueAsGuest={() => setAccountPromptDismissed(true)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Expanded Input Dock — centered on desktop */}
      <div className="max-w-3xl mx-auto w-full px-0">
        <InputAlexDockExpanded
          onSend={sendMessage}
          onMicToggle={handleMicToggle}
          isMicActive={voiceIsActive}
          isVoiceConnecting={voiceIsConnecting}
          disabled={isThinking}
          placeholder={voiceIsActive ? "Mode vocal actif — Alex vous écoute" : "Décrivez votre besoin..."}
        />
      </div>

      {/* Sheets */}
      <SheetEntrepreneurDetails
        contractor={detailContractor}
        open={!!detailContractor}
        onClose={() => setDetailContractor(null)}
        onBooking={() => {
          const c = detailContractor;
          setDetailContractor(null);
          if (c) setBookingContractor(c);
        }}
      />
      <SheetBookingSlots
        open={!!bookingContractor}
        onClose={() => setBookingContractor(null)}
        contractor={bookingContractor}
        slots={MOCK_SLOTS}
        onConfirm={handleBookingConfirm}
      />
    </div>
  );
}
