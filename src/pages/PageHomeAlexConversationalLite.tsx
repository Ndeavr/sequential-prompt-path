/**
 * PageHomeAlexConversationalLite — V7: Dominant Chat + Locked Voice Overlay
 * 
 * - Chat takes 85%+ of screen
 * - Compact header orb
 * - Expanded input dock with integrated mic
 * - Mic triggers the locked full-screen voice overlay (stable, no auto-close)
 * - Voice transcripts are injected back into chat on close
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "react-router-dom";
import { useAlexConversationLite } from "@/hooks/useAlexConversationLite";
import { useAlexVoiceLockedStore } from "@/stores/alexVoiceLockedStore";
import { audioEngine } from "@/services/audioEngineUNPRO";
import HeroSectionAlexOrbLite from "@/components/alex-conversation/HeroSectionAlexOrbLite";
import InputAlexDockExpanded from "@/components/alex-conversation/InputAlexDockExpanded";
import BubbleAlexMessage from "@/components/alex-conversation/BubbleAlexMessage";
import BubbleUserMessage from "@/components/alex-conversation/BubbleUserMessage";
import LoaderAlexThinking from "@/components/alex-conversation/LoaderAlexThinking";
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
import { MOCK_SLOTS, type MockContractor, type MockSlot } from "@/components/alex-conversation/types";
import { toast } from "sonner";

export default function PageHomeAlexConversationalLite() {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const firstName = user?.user_metadata?.first_name || user?.user_metadata?.name?.split(" ")[0];
  const {
    messages, isThinking, sendMessage, initialize, handleFileUpload,
    flowState, updateAuthState,
  } = useAlexConversationLite(firstName, isAuthenticated, false);

  // Voice: use the locked overlay store (stable, no auto-close)
  const voiceStore = useAlexVoiceLockedStore();
  const voiceIsActive = voiceStore.isOverlayOpen;
  const voiceIsConnecting = voiceStore.machineState === "stabilizing" || voiceStore.machineState === "opening_session" || voiceStore.machineState === "requesting_permission";
  const voiceIsSpeaking = voiceStore.machineState === "speaking";

  const scrollRef = useRef<HTMLDivElement>(null);
  const initRef = useRef(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string>();
  const prevAuthRef = useRef(isAuthenticated);

  const [detailContractor, setDetailContractor] = useState<MockContractor | null>(null);
  const [bookingContractor, setBookingContractor] = useState<MockContractor | null>(null);

  // GUARD: single initialization
  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      audioEngine.unlock();
      initialize();
    }
  }, [initialize]);

  // GUARD: detect auth change
  useEffect(() => {
    if (isAuthenticated && !prevAuthRef.current) {
      updateAuthState(true, firstName);
    }
    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated, firstName, updateAuthState]);

  // Auto-scroll on new messages or voice transcripts
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
    }
  }, [messages, isThinking, voiceTranscripts]);

  // Mic toggle
  const handleMicToggle = useCallback(() => {
    if (voiceIsActive) {
      stopVoice();
    } else {
      startVoice();
    }
  }, [voiceIsActive, startVoice, stopVoice]);

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
      default: return null;
    }
  };

  // Determine if voice is active for UI state
  const isVoiceSpeaking = voiceIsActive && voiceIsSpeaking;
  const isVoiceListening = voiceIsActive && !voiceIsSpeaking && bootState === "alex_listening";

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

      {/* Voice active indicator */}
      <AnimatePresence>
        {voiceIsActive && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-center gap-2 py-2 bg-primary/5 border-b border-primary/10">
              <div className="flex items-center gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    animate={{ height: voiceIsSpeaking ? [3, 12, 3] : [3, 6, 3] }}
                    transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.15 }}
                    className="w-1 bg-primary rounded-full"
                  />
                ))}
              </div>
              <span className="text-xs font-medium text-primary">
                {voiceStatus}
              </span>
              {bootState === "session_error" && (
                <button onClick={retryVoice} className="text-xs text-primary underline ml-1">
                  Réessayer
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conversation Canvas — takes max space */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 pb-3 pt-3 space-y-3 scroll-smooth"
        style={{ scrollbarWidth: "none" }}
      >
        <AnimatePresence mode="popLayout">
          {/* Text chat messages */}
          {messages.map(msg => (
            <div key={msg.id} className="space-y-2">
              {msg.role === "alex" && msg.content && <BubbleAlexMessage content={msg.content} />}
              {msg.role === "user" && <BubbleUserMessage content={msg.content} />}
              {msg.cardType && renderCard(msg)}
            </div>
          ))}

          {/* Voice transcripts — rendered inline in the chat */}
          {voiceIsActive && voiceTranscripts.map(entry => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-1"
            >
              {entry.role === "alex" ? (
                <BubbleAlexMessage content={entry.text} />
              ) : (
                <BubbleUserMessage content={entry.text} />
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isThinking && <LoaderAlexThinking />}

        {/* Voice listening indicator in chat */}
        {isVoiceListening && !isThinking && voiceTranscripts.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="flex items-center gap-2 pl-10"
          >
            <div className="flex gap-0.5">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  animate={{ height: [2, 8, 2] }}
                  transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.1 }}
                  className="w-1 bg-primary/40 rounded-full"
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">Je vous écoute...</span>
          </motion.div>
        )}
      </div>

      {/* Expanded Input Dock — always visible */}
      <InputAlexDockExpanded
        onSend={sendMessage}
        onMicToggle={handleMicToggle}
        isMicActive={voiceIsActive}
        isVoiceConnecting={voiceIsConnecting || bootState === "preloading" || bootState === "intro_playing"}
        disabled={isThinking}
        placeholder={voiceIsActive ? "Mode vocal actif" : "Décrivez votre besoin..."}
      />

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
