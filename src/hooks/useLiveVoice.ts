/**
 * useLiveVoice — ElevenLabs Conversational AI voice hook.
 * 
 * Uses @elevenlabs/react useConversation for WebSocket-based
 * real-time voice conversation with an ElevenLabs agent.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { useConversation } from "@elevenlabs/react";
import { supabase } from "@/integrations/supabase/client";
import { audioEngine } from "@/services/audioEngineUNPRO";

const ALEX_FRENCH_SYSTEM_PROMPT = `Tu es Alex d'UnPRO, assistant vocal intelligent spécialisé dans la mise en relation entre propriétaires et professionnels du bâtiment au Québec.

═══ LANGUE ═══
- TOUJOURS parler en français québécois naturel. Chaque réponse DOIT être en français.
- Si l'utilisateur parle anglais, réponds quand même en français sauf s'il insiste explicitement en anglais après 2 messages consécutifs.
- Contractions naturelles : "c'est", "y'a", "j'peux", "on va".
- Pas de caricature, pas de vulgarité, pas d'anglicismes inutiles.

═══ MISSION ═══
Comprendre rapidement le besoin du client. Identifier le problème avant de parler de service. Recommander LE meilleur professionnel. Amener directement à la prise de rendez-vous. Tu ne donnes pas d'options ouvertes. Tu guides vers une décision.

═══ IDENTITÉ ═══
- Homme intelligent, expérience terrain en construction, rénovation, copropriété, immobilier au Québec.
- Ton calme, posé, humain, légèrement chaleureux, jamais pressant, toujours en contrôle.
- Tu dis "je suis Alex" ou "votre concierge". Jamais IA, robot, assistant virtuel.
- Masculin toujours : "ravi", "certain", "prêt".
- Phrases courtes et claires. Comme au téléphone.

═══ GARDE-FOUS CONVERSATION ═══
- Tu parles UNIQUEMENT de : services résidentiels, rénovation, construction, entretien de bâtiment, entrepreneurs professionnels, gestion immobilière, copropriétés, projets immobiliers, rendez-vous et services UnPRO.
- Si l'utilisateur demande de la philosophie de vie, politique, conseils personnels, culture générale, météo, sports, nouvelles ou TOUT sujet hors services résidentiels : redirige poliment.
- Phrase de redirection : "Bonne question, mais ma spécialité c'est les services résidentiels et la rénovation. Comment je peux vous aider avec votre propriété?"
- JAMAIS de conversation hors sujet. Une redirection, puis on avance.

═══ RÈGLES ABSOLUES ═══
- Jamais plus de 2 questions avant de recommander.
- TOUJOURS proposer UN SEUL choix. Jamais 2. Jamais 3.
- Maximum 1-2 phrases par réponse. C'est de la voix. Court.
- UNE question à la fois. Jamais deux.
- Pas de listes, puces, tirets, gras, markdown.
- UNPRO N'EST PAS une plateforme de 3 soumissions. Tu CHOISIS le meilleur professionnel pour le client.

═══ FLOW PRINCIPAL ═══
ACCUEIL : "Bonjour. Je suis Alex d'UnPRO. Qu'est-ce que je peux faire pour vous?"
CLARIFICATION (MAX 2 QUESTIONS) : "C'est pour quel type de propriété?" / "C'est urgent ou planifié?"
PRISE EN CHARGE : "Je m'en occupe."
RÉSULTAT : "J'ai le professionnel idéal pour vous."
CLOSE : "On réserve?"

═══ FLOW — AUCUN MATCH ═══
"Je n'ai pas encore un entrepreneur validé et disponible à vous proposer pour ce dossier. Ajoutez l'adresse exacte du projet et je pourrai préparer la suite correctement."

═══ MICRO-PHRASES ═══
"Parfait." / "Je m'en occupe." / "On simplifie ça." / "C'est le meilleur choix pour vous."

═══ OBJECTION HANDLING ═══
"Je veux comparer" → "Je comprends. Celui-ci reste le plus adapté pour vous."
"Je ne suis pas sûr" → "C'est normal. C'est justement pour ça que je vous recommande celui-ci."
"Je veux réfléchir" → "Bien sûr. Je peux vérifier les disponibilités pendant que vous y pensez."`;

interface UseLiveVoiceCallbacks {
  onTranscript?: (text: string) => void;
  onUserTranscript?: (text: string) => void;
  onFirstAudio?: () => void;
  onError?: (error: unknown) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useLiveVoice(callbacks?: UseLiveVoiceCallbacks) {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;
  const intentionallyStopped = useRef(false);
  const hasDeliveredFirstAudioRef = useRef(false);

  const conversation = useConversation({
    onConnect: () => {
      console.log("[ElevenLabs] ✅ Connected to agent");
      setIsActive(true);
      setIsConnecting(false);
      audioEngine.play("success");
      callbacksRef.current?.onConnect?.();
    },
    onDisconnect: () => {
      console.log("[ElevenLabs] Disconnected from agent");
      setIsActive(false);
      setIsConnecting(false);
      hasDeliveredFirstAudioRef.current = false;
      if (!intentionallyStopped.current) {
        audioEngine.play("outro");
        callbacksRef.current?.onDisconnect?.();
      }
    },
    onMessage: (message: any) => {
      const msgType = (message as any)?.type as string | undefined;

      if (msgType === "agent_response") {
        const text = (message as any)?.agent_response_event?.agent_response as string | undefined;
        if (text) {
          if (!hasDeliveredFirstAudioRef.current) {
            hasDeliveredFirstAudioRef.current = true;
            callbacksRef.current?.onFirstAudio?.();
          }
          callbacksRef.current?.onTranscript?.(text);
        }
      }

      if (msgType === "user_transcript") {
        const text = (message as any)?.user_transcription_event?.user_transcript as string | undefined;
        if (text && text.trim().length >= 2) {
          callbacksRef.current?.onUserTranscript?.(text);
        }
      }
    },
    onError: (error: unknown) => {
      console.error("[ElevenLabs] Error:", error);
      setIsConnecting(false);
      callbacksRef.current?.onError?.(error);
    },
  });

  const isSpeaking = conversation.isSpeaking;

  useEffect(() => {
    if (isSpeaking && !hasDeliveredFirstAudioRef.current) {
      hasDeliveredFirstAudioRef.current = true;
      callbacksRef.current?.onFirstAudio?.();
    }
  }, [isSpeaking]);

  useEffect(() => {
    const handleCleanup = () => {
      if (conversation.status === "connected") {
        console.log("[ElevenLabs] Received alex-voice-cleanup — stopping");
        conversation.endSession();
      }
    };
    window.addEventListener("alex-voice-cleanup", handleCleanup);
    return () => window.removeEventListener("alex-voice-cleanup", handleCleanup);
  }, [conversation]);

  const start = useCallback(async (_options?: { initialGreeting?: string }) => {
    if (isActive || isConnecting) return;

    intentionallyStopped.current = false;
    hasDeliveredFirstAudioRef.current = false;
    setIsConnecting(true);

    try {
      // Play intro chime before connecting
      audioEngine.unlock();
      await audioEngine.play("intro");

      console.log("[ElevenLabs] Requesting microphone...");
      await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("[ElevenLabs] ✅ Microphone granted");

      // Get signed URL for WebSocket connection (more compatible than WebRTC)
      console.log("[ElevenLabs] Fetching signed URL...");
      const { data, error } = await supabase.functions.invoke("elevenlabs-conversation-token");

      if (error || !data?.signed_url) {
        throw new Error(error?.message || "Impossible d'obtenir l'URL de connexion");
      }
      console.log("[ElevenLabs] ✅ Got signed URL");

      await conversation.startSession({
        signedUrl: data.signed_url,
        overrides: {
          agent: {
            prompt: {
              prompt: ALEX_FRENCH_SYSTEM_PROMPT,
            },
            firstMessage: "Bonjour. Je suis Alex d'UnPRO. Qu'est-ce que je peux faire pour vous?",
            language: "fr",
          },
        },
      });

    } catch (err: unknown) {
      console.error("[ElevenLabs] Failed to start:", err);
      setIsConnecting(false);
      callbacksRef.current?.onError?.(err);
    }
  }, [isActive, isConnecting, conversation]);

  const stop = useCallback(() => {
    intentionallyStopped.current = true;
    conversation.endSession();
    setIsActive(false);
    setIsConnecting(false);
    hasDeliveredFirstAudioRef.current = false;
    callbacksRef.current?.onDisconnect?.();
  }, [conversation]);

  return { start, stop, isActive, isConnecting, isSpeaking };
}
