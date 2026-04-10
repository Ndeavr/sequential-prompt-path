/**
 * PageHomeAlexConversationalLite — Conversational homepage variant.
 * Alex-driven, mobile-first, premium, immersive.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useAlexConversationLite } from "@/hooks/useAlexConversationLite";
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
import SheetEntrepreneurDetails from "@/components/alex-conversation/SheetEntrepreneurDetails";
import SheetBookingSlots from "@/components/alex-conversation/SheetBookingSlots";
import { MOCK_SLOTS, type MockContractor, type MockSlot } from "@/components/alex-conversation/types";
import { toast } from "sonner";

export default function PageHomeAlexConversationalLite() {
  const { user, isAuthenticated } = useAuth();
  const firstName = user?.user_metadata?.first_name || user?.user_metadata?.name?.split(" ")[0];
  const { messages, isThinking, sendMessage, initialize } = useAlexConversationLite(firstName);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isMicActive, setIsMicActive] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string>();

  // Sheets
  const [detailContractor, setDetailContractor] = useState<MockContractor | null>(null);
  const [bookingContractor, setBookingContractor] = useState<MockContractor | null>(null);

  // Initialize greeting
  useEffect(() => {
    if (messages.length === 0) initialize();
  }, [initialize, messages.length]);

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isThinking]);

  const handleMicToggle = useCallback(() => {
    setIsMicActive(prev => !prev);
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
    toast.success(`Rendez-vous confirmé : ${slot.label}`);
    setBookingContractor(null);
  }, [isAuthenticated]);

  const renderCard = (msg: typeof messages[0]) => {
    switch (msg.cardType) {
      case "entrepreneur":
        return (
          <CardEntrepreneurInline
            contractor={msg.cardData}
            onViewProfile={() => setDetailContractor(msg.cardData)}
            onViewSlots={() => setBookingContractor(msg.cardData)}
          />
        );
      case "availability":
        return (
          <CardAvailabilitySlot
            slots={MOCK_SLOTS}
            selectedId={selectedSlotId}
            onSelect={handleSlotSelect}
          />
        );
      case "urgency":
        return <CardUrgencyAction />;
      case "project_suggestion":
        return <CardProjectSuggestion />;
      case "login_prompt":
        return <CardLoginPromptInline />;
      case "no_match":
        return <CardNoMatchFallback />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-background relative overflow-hidden">
      {/* Ambient background glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, hsl(var(--primary) / 0.06) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Orb Header */}
      <HeroSectionAlexOrbLite
        isListening={isMicActive}
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
              {msg.role === "alex" && <BubbleAlexMessage content={msg.content} />}
              {msg.role === "user" && <BubbleUserMessage content={msg.content} />}
              {msg.cardType && renderCard(msg)}
            </div>
          ))}
        </AnimatePresence>
        {isThinking && <LoaderAlexThinking />}
      </div>

      {/* Input Dock */}
      <InputAlexMessageComposer
        onSend={sendMessage}
        onMicToggle={handleMicToggle}
        isMicActive={isMicActive}
        disabled={isThinking}
      />

      {/* Detail Sheet */}
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

      {/* Booking Sheet */}
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
