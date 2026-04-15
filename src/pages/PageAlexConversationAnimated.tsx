/**
 * PageAlexConversationAnimated — Cinematic animated Alex conversation.
 * Demo flow engine with sequenced reveals, cards, slots, photo upload, confirmation.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import LayoutAlexCinematicShell from "@/components/alex-conversation/LayoutAlexCinematicShell";
import HeaderAlexPresenceStatus from "@/components/alex-conversation/HeaderAlexPresenceStatus";
import BubbleAlexVoiceMessage from "@/components/alex-conversation/BubbleAlexVoiceMessage";
import BubbleUserMessage from "@/components/alex-conversation/BubbleUserMessage";
import CardWhyThisChoice from "@/components/alex-conversation/CardWhyThisChoice";
import CardAvailableSlotsAnimated from "@/components/alex-conversation/CardAvailableSlotsAnimated";
import CardAppointmentConfirmed from "@/components/alex-conversation/CardAppointmentConfirmed";
import CardPhotoUploadedPreview from "@/components/alex-conversation/CardPhotoUploadedPreview";
import CardUploadPromptInline from "@/components/alex-conversation/CardUploadPromptInline";
import CardRecommendationSummary from "@/components/alex-conversation/CardRecommendationSummary";
import LoaderAlexThinking from "@/components/alex-conversation/LoaderAlexThinking";
import InputAlexDockExpanded from "@/components/alex-conversation/InputAlexDockExpanded";

// ─── DEMO FLOW DEFINITION ───
type StepType =
  | "alex_text"
  | "user_text"
  | "thinking"
  | "photo_prompt"
  | "photo_preview"
  | "recommendation"
  | "why_this_choice"
  | "slots"
  | "confirmation"
  | "wait_user";

interface FlowStep {
  id: string;
  type: StepType;
  content?: string;
  delay: number; // ms before showing
  data?: any;
}

const DEMO_FLOW: FlowStep[] = [
  { id: "a1", type: "alex_text", content: "Bonjour ! Je suis Alex, votre assistant UNPRO. Comment puis-je vous aider aujourd'hui ?", delay: 600 },
  { id: "u1", type: "user_text", content: "J'ai un problème d'isolation dans mon entretoit. Il y a des barrages de glace.", delay: 2200 },
  { id: "t1", type: "thinking", delay: 1200 },
  { id: "a2", type: "alex_text", content: "Je comprends — les barrages de glace sont souvent causés par une mauvaise isolation de l'entretoit. Pourriez-vous m'envoyer une photo pour que je puisse mieux évaluer la situation ?", delay: 800 },
  { id: "pp", type: "photo_prompt", delay: 600 },
  { id: "u2_photo", type: "photo_preview", delay: 2500, data: { previewUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=300&fit=crop", status: "processing" } },
  { id: "t2", type: "thinking", delay: 2000 },
  { id: "a3", type: "alex_text", content: "Merci pour la photo. Je détecte bien une accumulation de glace au niveau de la bordure du toit. C'est un problème classique d'isolation insuffisante dans l'entretoit.", delay: 800 },
  { id: "u2", type: "user_text", content: "Est-ce que c'est grave ? Est-ce qu'il faut intervenir vite ?", delay: 2000 },
  { id: "t3", type: "thinking", delay: 1000 },
  { id: "a4", type: "alex_text", content: "Ce n'est pas une urgence immédiate, mais je vous recommande une intervention avant la prochaine saison froide. Je vous ai trouvé le meilleur spécialiste dans votre secteur.", delay: 800 },
  { id: "rec", type: "recommendation", delay: 600, data: { contractorName: "Isolation Pro Rive-Nord", specialty: "Isolation d'entretoit & ventilation", score: 92, city: "Terrebonne" } },
  { id: "why", type: "why_this_choice", delay: 400, data: { reasons: ["Spécialiste isolation d'entretoit", "Habitué aux barrages de glace", "Disponible dans votre secteur", "Intervention possible cette semaine"] } },
  { id: "a5", type: "alex_text", content: "Voici les créneaux disponibles pour une visite d'évaluation :", delay: 1200 },
  { id: "slots", type: "slots", delay: 500, data: {
    slots: [
      { id: "s1", label: "Lun 14 avr · 15h30", isSuggested: true },
      { id: "s2", label: "Mar 15 avr · 11h00" },
      { id: "s3", label: "Mer 16 avr · 9h30" },
      { id: "s4", label: "Jeu 17 avr · 14h00" },
    ]
  }},
  { id: "wait_slot", type: "wait_user", delay: 0 },
];

const AFTER_SLOT_FLOW: FlowStep[] = [
  { id: "t4", type: "thinking", delay: 600 },
  { id: "a6", type: "alex_text", content: "Parfait ! Je confirme votre rendez-vous.", delay: 800 },
  { id: "conf", type: "confirmation", delay: 500 },
  { id: "a7", type: "alex_text", content: "Vous recevrez une confirmation par courriel. En attendant, n'hésitez pas si vous avez d'autres questions. 😊", delay: 1200 },
];

type PresenceStatus = "online" | "speaking" | "listening" | "thinking" | "analyzing" | "searching_slots" | "ended";

export default function PageAlexConversationAnimated() {
  const [visibleSteps, setVisibleSteps] = useState<FlowStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isFlowRunning, setIsFlowRunning] = useState(true);
  const [selectedSlotId, setSelectedSlotId] = useState<string>();
  const [confirmedSlotId, setConfirmedSlotId] = useState<string>();
  const [presenceStatus, setPresenceStatus] = useState<PresenceStatus>("online");
  const [photoStatus, setPhotoStatus] = useState<"uploaded" | "processing" | "analyzed">("processing");
  const [waitingForUser, setWaitingForUser] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const flowRef = useRef<FlowStep[]>(DEMO_FLOW);
  const timerRef = useRef<NodeJS.Timeout>();

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
    }
  }, [visibleSteps, presenceStatus]);

  // Flow engine
  useEffect(() => {
    if (!isFlowRunning || waitingForUser) return;
    if (currentStepIndex >= flowRef.current.length) {
      setIsFlowRunning(false);
      setPresenceStatus("online");
      return;
    }

    const step = flowRef.current[currentStepIndex];
    
    timerRef.current = setTimeout(() => {
      // Update presence status
      if (step.type === "thinking") {
        setPresenceStatus("thinking");
      } else if (step.type === "alex_text") {
        setPresenceStatus("speaking");
      } else if (step.type === "user_text") {
        setPresenceStatus("listening");
      } else if (step.type === "photo_preview") {
        setPresenceStatus("analyzing");
        // Simulate photo analysis completion
        setPhotoStatus("processing");
        setTimeout(() => setPhotoStatus("analyzed"), 2000);
      } else if (step.type === "slots") {
        setPresenceStatus("searching_slots");
      } else if (step.type === "wait_user") {
        setWaitingForUser(true);
        setPresenceStatus("online");
        return;
      }

      // Don't add thinking/wait to visible steps
      if (step.type !== "thinking" && step.type !== "wait_user") {
        setVisibleSteps(prev => [...prev, step as FlowStep]);
      }

      // Clear thinking status after a beat
      if (step.type === "thinking") {
        setTimeout(() => {
          setCurrentStepIndex(prev => prev + 1);
        }, step.delay);
        return;
      }

      setCurrentStepIndex(prev => prev + 1);
    }, step.delay);

    return () => clearTimeout(timerRef.current);
  }, [currentStepIndex, isFlowRunning, waitingForUser]);

  // Handle slot selection
  const handleSlotSelect = useCallback((slot: { id: string; label: string }) => {
    setSelectedSlotId(slot.id);
    
    // After a beat, confirm and continue flow
    setTimeout(() => {
      setConfirmedSlotId(slot.id);
      setWaitingForUser(false);
      
      // Append after-slot flow
      flowRef.current = [...flowRef.current, ...AFTER_SLOT_FLOW.map(s => ({
        ...s,
        data: s.type === "confirmation" ? { dateLabel: slot.label, contractorName: "Isolation Pro Rive-Nord" } : s.data,
      }))];
      setCurrentStepIndex(prev => prev + 1);
      setIsFlowRunning(true);
    }, 800);
  }, []);

  // Photo upload handler (demo)
  const handlePhotoUpload = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    const step: FlowStep = {
      id: "user_photo_" + Date.now(),
      type: "photo_preview",
      delay: 0,
      data: { previewUrl: url, status: "processing" },
    };
    setVisibleSteps(prev => [...prev, step]);
    setPhotoStatus("processing");
    setTimeout(() => setPhotoStatus("analyzed"), 2500);
  }, []);

  const isShowingThinking = presenceStatus === "thinking" || presenceStatus === "analyzing";

  return (
    <LayoutAlexCinematicShell>
      {/* Header */}
      <HeaderAlexPresenceStatus status={presenceStatus} />

      {/* Conversation Thread */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 pb-4 pt-3 space-y-3"
        style={{ scrollbarWidth: "none" }}
      >
        <div className="max-w-3xl mx-auto w-full">
          <AnimatePresence mode="popLayout">
            {visibleSteps.map((step, idx) => (
              <div key={step.id} className="mb-3">
                {step.type === "alex_text" && (
                  <BubbleAlexVoiceMessage
                    content={step.content!}
                    hasVoice={idx < 3}
                  />
                )}
                {step.type === "user_text" && (
                  <BubbleUserMessage content={step.content!} />
                )}
                {step.type === "photo_prompt" && (
                  <CardUploadPromptInline onFileSelected={handlePhotoUpload} />
                )}
                {step.type === "photo_preview" && (
                  <CardPhotoUploadedPreview
                    previewUrl={step.data.previewUrl}
                    status={step.id.startsWith("user_photo") ? photoStatus : (photoStatus === "analyzed" ? "analyzed" : step.data.status)}
                  />
                )}
                {step.type === "recommendation" && (
                  <CardRecommendationSummary
                    contractorName={step.data.contractorName}
                    specialty={step.data.specialty}
                    score={step.data.score}
                    city={step.data.city}
                  />
                )}
                {step.type === "why_this_choice" && (
                  <CardWhyThisChoice reasons={step.data.reasons} />
                )}
                {step.type === "slots" && (
                  <CardAvailableSlotsAnimated
                    slots={step.data.slots}
                    selectedId={selectedSlotId}
                    confirmedId={confirmedSlotId}
                    onSelect={handleSlotSelect}
                  />
                )}
                {step.type === "confirmation" && (
                  <CardAppointmentConfirmed
                    dateLabel={step.data?.dateLabel || ""}
                    contractorName={step.data?.contractorName}
                  />
                )}
              </div>
            ))}
          </AnimatePresence>

          {/* Thinking indicator */}
          {isShowingThinking && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <LoaderAlexThinking />
            </motion.div>
          )}
        </div>
      </div>

      {/* Composer - locked in demo mode */}
      <div className="max-w-3xl mx-auto w-full px-0">
        <InputAlexDockExpanded
          onSend={() => {}}
          onMicToggle={() => {}}
          isMicActive={false}
          disabled={true}
          placeholder="Démonstration automatique…"
        />
      </div>
    </LayoutAlexCinematicShell>
  );
}
