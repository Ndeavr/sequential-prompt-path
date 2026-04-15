/**
 * PageHomeAlexConversationalLite — V9: Live AI + Inline Voice + Mute + Transcription
 */
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useSearchParams } from "react-router-dom";
import { useAlexConversationLite } from "@/hooks/useAlexConversationLite";
import { useLiveVoice } from "@/hooks/useLiveVoice";
import { audioEngine } from "@/services/audioEngineUNPRO";
import { detectIntentAndLocation, buildAlexOpening, POPULAR_SEARCH_INTENTS } from "@/services/intentLocationDetector";
import HeroSectionAlexOrbLite from "@/components/alex-conversation/HeroSectionAlexOrbLite";
import LayoutAlexCinematicShell from "@/components/alex-conversation/LayoutAlexCinematicShell";
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
import ButtonAlexMuteToggle from "@/components/alex-conversation/ButtonAlexMuteToggle";
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

  // ── Inline Voice Integration ──
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceConnecting, setVoiceConnecting] = useState(false);
  const [voiceSpeaking, setVoiceSpeaking] = useState(false);
  const [isVoiceMuted, setIsVoiceMuted] = useState(() => {
    try { return localStorage.getItem("alex-voice-muted") === "true"; } catch { return false; }
  });

  const voice = useLiveVoice({
    onConnect: () => {
      setVoiceActive(true);
      setVoiceConnecting(false);
      toast.success("Mode vocal activé");
    },
    onDisconnect: () => {
      setVoiceActive(false);
      setVoiceConnecting(false);
      setVoiceSpeaking(false);
    },
    onTranscript: (text) => {
      // Alex's spoken response → add as alex bubble
      if (text && text.trim()) {
        // Use emitSafe-like logic by adding directly to messages via sendMessage won't work here
        // Instead, we rely on the conversation hook's message state
        // For now, we inject Alex transcript as a message
        setMessages(prev => {
          const id = `voice-alex-${Date.now()}`;
          if (prev.length > 0 && prev[prev.length - 1].content === text && prev[prev.length - 1].role === "alex") return prev;
          return [...prev, { id, role: "alex" as const, content: text, timestamp: Date.now(), isVoice: true }];
        });
        setVoiceSpeaking(true);
      }
    },
    onUserTranscript: (text) => {
      // User's speech → add as user bubble
      if (text && text.trim()) {
        setMessages(prev => {
          const id = `voice-user-${Date.now()}`;
          if (prev.length > 0 && prev[prev.length - 1].content === text && prev[prev.length - 1].role === "user") return prev;
          return [...prev, { id, role: "user" as const, content: text, timestamp: Date.now(), isVoice: true }];
        });
        setVoiceSpeaking(false);
        // Also send to AI for processing (fire-and-forget for text thread)
        sendMessage(text);
      }
    },
    onError: (err) => {
      setVoiceConnecting(false);
      toast.error("Erreur de connexion vocale");
      console.error("[Voice]", err);
    },
  });

  // We need direct access to setMessages from the hook - but the hook doesn't expose it.
  // Instead, we'll manage voice messages in a separate state and merge for display.
  const [voiceMessages, setVoiceMessagesState] = useState<Array<{id: string; role: "alex" | "user"; content: string; timestamp: number; isVoice: boolean}>>([]);
  
  // Override setMessages reference for voice callbacks
  const setMessages = useCallback((updater: (prev: any[]) => any[]) => {
    setVoiceMessagesState(updater);
  }, []);

  // Merge conversation messages + voice messages for display
  const allMessages = useMemo(() => {
    const combined = [...messages, ...voiceMessages];
    combined.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    return combined;
  }, [messages, voiceMessages]);

  // Apply mute state via ElevenLabs volume control
  useEffect(() => {
    if (voice.isActive && voice.conversation) {
      try {
        voice.conversation.setVolume({ volume: isVoiceMuted ? 0 : 1 });
      } catch {}
    }
    try { localStorage.setItem("alex-voice-muted", String(isVoiceMuted)); } catch {}
  }, [isVoiceMuted, voice.isActive, voice.conversation]);

  const handleMuteToggle = useCallback(() => {
    setIsVoiceMuted(prev => !prev);
  }, []);

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
  const userMessageCount = allMessages.filter(m => m.role === "user").length;
  const alexMessageCount = allMessages.filter(m => m.role === "alex").length;
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

  // ── Inject intent context ──
  useEffect(() => {
    if (intentInjectedRef.current) return;
    if (!detectedContext) return;
    if (messages.length > 0) return;
    if (!initRef.current) return;

    intentInjectedRef.current = true;
    const timer = setTimeout(() => {
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
  }, [allMessages, isThinking, shouldShowAccountPrompt]);

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

  // ── Mic toggle: inline voice ──
  const handleMicToggle = useCallback(() => {
    if (voiceActive) {
      voice.stop();
    } else {
      audioEngine.unlock();
      setVoiceConnecting(true);
      voice.start();
    }
  }, [voiceActive, voice]);

  // Auto-start voice on /alex/voice
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (location.pathname === "/alex/voice" && !autoStartedRef.current && !voiceActive) {
      autoStartedRef.current = true;
      setTimeout(() => {
        setVoiceConnecting(true);
        voice.start();
      }, 500);
    }
  }, [location.pathname, voiceActive, voice]);

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
  const renderCard = (msg: typeof allMessages[0]) => {
    const cardType = (msg as any).cardType;
    const cardData = (msg as any).cardData;
    if (!cardType) return null;
    
    switch (cardType) {
      case "problem_summary":
        return <CardAlexProblemSummary problemType={cardData?.problemType} projectType={cardData?.projectType} urgency={cardData?.urgency} summary={cardData?.summary} />;
      case "profile_completion":
        return <CardAlexProfileCompletionRequired missingFields={flowState.userContext.missingFields} completionPercent={60} />;
      case "address_required":
        return <CardAlexAddressRequired reason="Votre adresse permet de trouver les meilleurs entrepreneurs dans votre secteur." onAddAddress={() => sendMessage("Montréal")} />;
      case "entrepreneur":
        return (
          <div className="space-y-2">
            <CardEntrepreneurInline contractor={cardData} onViewProfile={() => setDetailContractor(cardData)} onViewSlots={() => setBookingContractor(cardData)} />
            <CardAlexBookingNextStep contractorName={cardData?.name} specialty={cardData?.specialty} score={cardData?.score} nextSlotLabel="Lun 14 avr · 9h" onBook={() => setBookingContractor(cardData)} />
          </div>
        );
      case "availability":
        return <CardAvailabilitySlot slots={MOCK_SLOTS} selectedId={selectedSlotId} onSelect={handleSlotSelect} />;
      case "urgency": return <CardUrgencyAction />;
      case "project_suggestion": return <CardProjectSuggestion />;
      case "login_prompt": return <CardLoginPromptInline />;
      case "no_match": return <CardNoMatchFallback />;
      case "business_analysis": return <CardBusinessAnalysisScore data={cardData} />;
      case "quote_analysis": return <CardQuoteAnalysisBreakdown data={cardData} />;
      case "photo_design": return <CardPhotoDesignSuggestions data={cardData} />;
      case "photo_problem": return <CardPhotoProblemDiagnosis data={cardData} onFindPro={() => sendMessage("Trouvez-moi un professionnel")} />;
      case "aipp_score": return <CardAIPPScore entityName={cardData?.entityName} score={cardData?.score} tier={cardData?.tier} />;
      case "improvement_actions": return <CardImprovementActions actions={cardData || []} />;
      case "upload_photo": return <WidgetUploadInline type="photo" onFileSelected={(f) => handleFileUpload(f, "photo")} />;
      case "upload_quote": return <WidgetUploadInline type="quote" onFileSelected={(f) => handleFileUpload(f, "quote")} />;
      case "inline_form":
        return <PanelAlexInlineFormRenderer data={cardData} onSubmit={(vals) => sendMessage(`Formulaire soumis: ${JSON.stringify(vals)}`)} />;
      case "contractor_picker":
        return <PanelAlexContractorPicker data={cardData} onSelect={(c) => setDetailContractor(c)} onViewProfile={(c) => setDetailContractor(c)} />;
      case "booking_scheduler":
        return <PanelAlexBookingScheduler data={cardData} onConfirm={(slot) => { audioEngine.play("success"); toast.success(`Rendez-vous confirmé : ${slot.label}`); }} />;
      case "checkout_embedded":
        return <PanelAlexCheckoutEmbedded data={cardData} onCheckout={() => { window.location.href = `/checkout/native/${cardData?.planCode}`; }} />;
      case "before_after":
        return <PanelAlexBeforeAfterStudio data={cardData} onRegenerate={() => sendMessage("Régénérer l'avant/après")} />;
      case "image_gallery":
        return <PanelAlexInlineImageGallery data={cardData} />;
      case "next_best_action":
        return <PanelAlexNextBestActionCard data={cardData} onAccept={(key) => sendMessage(cardData?.label || key)} />;
      case "task_progress":
        return <PanelAlexLiveTaskStack data={cardData} />;
      case "address_confirmation":
        return <CardAlexAddressConfirmation data={cardData} onConfirm={() => sendMessage("Adresse confirmée")} onEdit={(addr) => sendMessage(`Nouvelle adresse: ${addr}`)} />;
      case "form_autofill_preview":
        return <PanelAlexFormAutoFillPreview data={cardData} onConfirm={() => sendMessage("Données confirmées")} onEdit={() => sendMessage("Je veux modifier mes informations")} />;
      default: return null;
    }
  };

  // Voice state labels
  const thinkingLabel = voiceActive
    ? (voice.isSpeaking ? "Alex parle..." : "Alex écoute...")
    : undefined;

  return (
    <LayoutAlexCinematicShell>

      {/* Compact Header */}
      <HeroSectionAlexOrbLite
        isListening={voiceActive && !voice.isSpeaking}
        isSpeaking={voiceActive && voice.isSpeaking}
        isThinking={isThinking}
      />

      {/* Intent Detection Banner */}
      {detectedContext && (
        <BannerIntentDetected
          intentLabel={detectedContext.intentLabel}
          city={detectedContext.city}
        />
      )}

      {/* Conversation Canvas */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 pb-3 pt-3 space-y-3 scroll-smooth"
        style={{ scrollbarWidth: "none" }}
      >
        <div className="max-w-3xl mx-auto w-full">
          <AnimatePresence mode="popLayout">
            {allMessages.map(msg => (
              <div key={msg.id} className="space-y-2 mb-3">
                {msg.role === "alex" && msg.content && (
                  <BubbleAlexMessage content={msg.content} />
                )}
                {msg.role === "user" && <BubbleUserMessage content={msg.content} />}
                {renderCard(msg)}
              </div>
            ))}
          </AnimatePresence>

          {isThinking && <LoaderAlexThinking label={thinkingLabel} />}

          {/* Voice listening indicator */}
          {voiceActive && !isThinking && !voice.isSpeaking && (
            <LoaderAlexThinking label="Alex écoute..." />
          )}

          {/* Account prompt */}
          {shouldShowAccountPrompt && (
            <div className="my-4">
              <CardAccountPromptInline
                onContinueAsGuest={() => setAccountPromptDismissed(true)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Input Dock with Mute Toggle */}
      <div className="max-w-3xl mx-auto w-full px-0">
        <div className="flex items-center">
          {voiceActive && (
            <div className="pl-2">
              <ButtonAlexMuteToggle
                isMuted={isVoiceMuted}
                onToggle={handleMuteToggle}
              />
            </div>
          )}
          <div className="flex-1">
            <InputAlexDockExpanded
              onSend={sendMessage}
              onMicToggle={handleMicToggle}
              isMicActive={voiceActive}
              isVoiceConnecting={voiceConnecting}
              disabled={isThinking}
              placeholder={voiceActive ? "Mode vocal actif — Alex vous écoute" : "Décrivez votre besoin..."}
            />
          </div>
        </div>
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
    </LayoutAlexCinematicShell>
  );
}
