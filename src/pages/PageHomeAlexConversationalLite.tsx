/**
 * PageHomeAlexConversationalLite — V5: Voice Autostart + Strict Guards
 * 
 * Unified conversation page with proper voice bootstrap.
 * When mic is activated, shows PanelAlexVoiceSurface with full boot sequence.
 * No duplicate controls, no infinite spinners, greeting before listening.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useAlexConversationLite } from "@/hooks/useAlexConversationLite";
import { audioEngine } from "@/services/audioEngineUNPRO";
import HeroSectionAlexOrbLite from "@/components/alex-conversation/HeroSectionAlexOrbLite";
import InputAlexMessageComposer from "@/components/alex-conversation/InputAlexMessageComposer";
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
import PanelAlexVoiceSurface from "@/components/alex-conversation/PanelAlexVoiceSurface";
import { MOCK_SLOTS, type MockContractor, type MockSlot } from "@/components/alex-conversation/types";
import { toast } from "sonner";

export default function PageHomeAlexConversationalLite() {
  const { user, isAuthenticated } = useAuth();
  const firstName = user?.user_metadata?.first_name || user?.user_metadata?.name?.split(" ")[0];
  const {
    messages, isThinking, sendMessage, initialize, handleFileUpload,
    flowState, updateAuthState,
  } = useAlexConversationLite(firstName, isAuthenticated, false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const initRef = useRef(false);
  const [voiceMode, setVoiceMode] = useState(false);
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

  // GUARD: detect auth change → resume flow (not re-initialize)
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
  }, [messages, isThinking]);

  const handleMicToggle = useCallback(() => {
    setVoiceMode(prev => !prev);
  }, []);

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

  return (
    <div className="flex flex-col h-[100dvh] bg-background relative overflow-hidden">
      {/* Ambient glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, hsl(var(--primary) / 0.06) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Voice Mode: Full surface replaces orb + conversation */}
      <AnimatePresence>
        {voiceMode && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute inset-0 z-40 bg-background/98 backdrop-blur-sm flex flex-col items-center justify-center p-6"
          >
            <PanelAlexVoiceSurface
              feature="conversation"
              onClose={() => setVoiceMode(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Orb Header */}
      <HeroSectionAlexOrbLite
        isListening={voiceMode}
        isSpeaking={false}
        isThinking={isThinking}
      />

      {/* Conversation Canvas */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 pb-2 space-y-3 scroll-smooth"
        style={{ scrollbarWidth: "none" }}
      >
        <AnimatePresence mode="popLayout">
          {messages.map(msg => (
            <div key={msg.id} className="space-y-2">
              {msg.role === "alex" && msg.content && <BubbleAlexMessage content={msg.content} />}
              {msg.role === "user" && <BubbleUserMessage content={msg.content} />}
              {msg.cardType && renderCard(msg)}
            </div>
          ))}
        </AnimatePresence>
        {isThinking && <LoaderAlexThinking />}
      </div>

      {/* Input Dock — hidden when voice mode is active */}
      {!voiceMode && (
        <InputAlexMessageComposer
          onSend={sendMessage}
          onMicToggle={handleMicToggle}
          isMicActive={voiceMode}
          disabled={isThinking}
        />
      )}

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
