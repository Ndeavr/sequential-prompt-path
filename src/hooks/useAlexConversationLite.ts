/**
 * useAlexConversationLite — Drives the conversational homepage logic.
 * Simulates intent detection + card injection with mock data.
 * Production-ready structure: swap mock logic for real edge functions.
 */
import { useState, useCallback, useRef } from "react";
import type { ConversationMessage, InlineCardType } from "@/components/alex-conversation/types";
import { MOCK_CONTRACTORS } from "@/components/alex-conversation/types";

const INTENT_KEYWORDS: Record<string, { intent: InlineCardType; response: string }> = {
  plombier: { intent: "entrepreneur", response: "J'ai trouvé les meilleurs professionnels pour vous." },
  plomberie: { intent: "entrepreneur", response: "Je m'en occupe. Voici un expert recommandé dans votre secteur." },
  électricien: { intent: "entrepreneur", response: "Voici un électricien certifié disponible rapidement." },
  toiture: { intent: "entrepreneur", response: "J'ai identifié un spécialiste toiture de confiance." },
  rénovation: { intent: "entrepreneur", response: "Je vous montre les entrepreneurs les mieux notés pour ce type de projet." },
  urgent: { intent: "urgency", response: "Je détecte une urgence. Je vous connecte immédiatement." },
  urgence: { intent: "urgency", response: "Situation urgente reçue. Je priorise votre demande." },
  fuite: { intent: "urgency", response: "Une fuite nécessite une intervention rapide. Je m'en occupe." },
  rendez: { intent: "availability", response: "Voici les créneaux disponibles." },
  disponibilité: { intent: "availability", response: "On bloque ça ? Voici les prochains créneaux." },
  réserver: { intent: "availability", response: "Je vous montre les disponibilités." },
  design: { intent: "project_suggestion", response: "Bonne idée. Je te montre une approche optimale." },
  inspiration: { intent: "project_suggestion", response: "Voici ce que je recommande pour votre projet." },
  isolation: { intent: "project_suggestion", response: "L'isolation est un excellent investissement. Je te montre." },
  soumission: { intent: "entrepreneur", response: "Plutôt que 3 soumissions, je vous recommande le meilleur professionnel." },
  prix: { intent: "entrepreneur", response: "Je calcule une estimation. Voici le professionnel recommandé." },
  maison: { intent: "entrepreneur", response: "Dites-moi ce dont votre maison a besoin, je m'en occupe." },
};

function detectIntent(text: string): { intent: InlineCardType; response: string } | null {
  const lower = text.toLowerCase();
  for (const [keyword, result] of Object.entries(INTENT_KEYWORDS)) {
    if (lower.includes(keyword)) return result;
  }
  return null;
}

export function useAlexConversationLite(userName?: string) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const idRef = useRef(0);

  const addMessage = useCallback((role: ConversationMessage["role"], content: string, cardType?: InlineCardType, cardData?: any) => {
    const msg: ConversationMessage = {
      id: `msg-${++idRef.current}`,
      role,
      content,
      cardType,
      cardData,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, msg]);
    return msg;
  }, []);

  const initialize = useCallback(() => {
    const greeting = userName
      ? `Bonjour ${userName}. Que puis-je faire pour vous aujourd'hui ?`
      : "Bonjour. Je suis Alex, votre assistant UNPRO. Décrivez-moi votre besoin, je m'en occupe.";
    addMessage("alex", greeting);
  }, [userName, addMessage]);

  const sendMessage = useCallback(async (text: string) => {
    addMessage("user", text);
    setIsThinking(true);

    // Simulate processing delay
    await new Promise(r => setTimeout(r, 800 + Math.random() * 600));

    const detected = detectIntent(text);

    if (detected) {
      if (detected.intent === "entrepreneur") {
        const contractor = MOCK_CONTRACTORS[Math.floor(Math.random() * MOCK_CONTRACTORS.length)];
        addMessage("alex", detected.response, "entrepreneur", contractor);
      } else {
        addMessage("alex", detected.response, detected.intent);
      }
    } else {
      // Generic follow-up
      const followUps = [
        "Pouvez-vous me préciser votre ville ?",
        "De quel type de propriété s'agit-il ?",
        "C'est noté. Quel est le niveau d'urgence ?",
        "Je comprends. Avez-vous un budget approximatif en tête ?",
      ];
      addMessage("alex", followUps[Math.floor(Math.random() * followUps.length)]);
    }

    setIsThinking(false);
  }, [addMessage]);

  return { messages, isThinking, sendMessage, initialize, addMessage };
}
