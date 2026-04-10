/**
 * useAlexConversationLite — Drives the conversational homepage logic.
 * Detects analysis intents (business, quote, photo) and displays result cards inline.
 * Production-ready structure: swap mock logic for real edge functions.
 */
import { useState, useCallback, useRef } from "react";
import type { ConversationMessage, InlineCardType } from "@/components/alex-conversation/types";
import {
  MOCK_CONTRACTORS,
  MOCK_BUSINESS_ANALYSIS,
  MOCK_QUOTE_ANALYSIS,
  MOCK_PHOTO_DESIGN,
  MOCK_PHOTO_PROBLEM,
} from "@/components/alex-conversation/types";
import { audioEngine } from "@/services/audioEngineUNPRO";

interface IntentMatch {
  intent: InlineCardType;
  response: string;
  data?: any;
}

const INTENT_KEYWORDS: Record<string, IntentMatch> = {
  // Business analysis
  "analyser mon entreprise": { intent: "business_analysis", response: "J'analyse votre entreprise. Voici les résultats.", data: MOCK_BUSINESS_ANALYSIS },
  "score entreprise": { intent: "business_analysis", response: "Voici l'analyse complète de votre positionnement.", data: MOCK_BUSINESS_ANALYSIS },
  "visibilité": { intent: "business_analysis", response: "Je vérifie votre visibilité en ligne.", data: MOCK_BUSINESS_ANALYSIS },
  "aipp": { intent: "aipp_score", response: "Voici votre score AIPP.", data: { entityName: MOCK_BUSINESS_ANALYSIS.entityName, score: MOCK_BUSINESS_ANALYSIS.aippScore, tier: "gold" } },

  // Quote analysis
  "analyser soumission": { intent: "quote_analysis", response: "J'ai analysé votre soumission. Voici le verdict.", data: MOCK_QUOTE_ANALYSIS },
  "comparer soumission": { intent: "quote_analysis", response: "Analyse de soumission terminée.", data: MOCK_QUOTE_ANALYSIS },
  "soumission": { intent: "upload_quote", response: "Envoyez-moi votre soumission, je l'analyse immédiatement." },
  "devis": { intent: "upload_quote", response: "Partagez votre devis, je le décortique pour vous." },

  // Photo design
  "design": { intent: "photo_design", response: "J'ai analysé votre espace. Voici mes suggestions.", data: MOCK_PHOTO_DESIGN },
  "inspiration": { intent: "photo_design", response: "Voici les styles qui correspondent le mieux.", data: MOCK_PHOTO_DESIGN },
  "décoration": { intent: "photo_design", response: "Belles possibilités. Voici ce que je recommande.", data: MOCK_PHOTO_DESIGN },
  "cuisine": { intent: "photo_design", response: "Voici des concepts pour votre cuisine.", data: MOCK_PHOTO_DESIGN },

  // Photo problem
  "moisissure": { intent: "photo_problem", response: "J'ai identifié le problème. Voici mon diagnostic.", data: MOCK_PHOTO_PROBLEM },
  "infiltration": { intent: "photo_problem", response: "Diagnostic terminé. Action recommandée.", data: MOCK_PHOTO_PROBLEM },
  "fissure": { intent: "photo_problem", response: "J'ai analysé la fissure. Voici les détails.", data: { ...MOCK_PHOTO_PROBLEM, issueType: "Fissure de fondation", severity: "medium" as const, estimatedCost: "500 $ – 3 000 $" } },
  "toiture": { intent: "photo_problem", response: "Diagnostic toiture effectué.", data: { ...MOCK_PHOTO_PROBLEM, issueType: "Dégradation toiture", severity: "high" as const, estimatedCost: "2 000 $ – 8 000 $" } },
  "photo": { intent: "upload_photo", response: "Envoyez-moi une photo, j'analyse immédiatement." },

  // Entrepreneur / booking
  "plombier": { intent: "entrepreneur", response: "J'ai trouvé les meilleurs professionnels pour vous." },
  "plomberie": { intent: "entrepreneur", response: "Je m'en occupe. Voici un expert recommandé." },
  "électricien": { intent: "entrepreneur", response: "Voici un électricien certifié disponible rapidement." },
  "rénovation": { intent: "entrepreneur", response: "Voici les entrepreneurs les mieux notés." },
  "urgent": { intent: "urgency", response: "Je détecte une urgence. Je vous connecte immédiatement." },
  "urgence": { intent: "urgency", response: "Situation urgente. Je priorise votre demande." },
  "fuite": { intent: "urgency", response: "Une fuite nécessite une intervention rapide. Je m'en occupe." },
  "rendez": { intent: "availability", response: "Voici les créneaux disponibles." },
  "disponibilité": { intent: "availability", response: "On bloque ça ? Voici les prochains créneaux." },
  "réserver": { intent: "availability", response: "Je vous montre les disponibilités." },
  "isolation": { intent: "project_suggestion", response: "L'isolation est un excellent investissement." },
  "prix": { intent: "entrepreneur", response: "Je calcule une estimation. Voici le professionnel recommandé." },
};

function detectIntent(text: string): IntentMatch | null {
  const lower = text.toLowerCase();
  // Check longer phrases first for better matching
  const sorted = Object.entries(INTENT_KEYWORDS).sort((a, b) => b[0].length - a[0].length);
  for (const [keyword, result] of sorted) {
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
    audioEngine.play("thinking");

    // Simulate processing delay
    await new Promise(r => setTimeout(r, 600 + Math.random() * 500));

    const detected = detectIntent(text);

    if (detected) {
      audioEngine.play("success");
      if (detected.intent === "entrepreneur") {
        const contractor = MOCK_CONTRACTORS[Math.floor(Math.random() * MOCK_CONTRACTORS.length)];
        addMessage("alex", detected.response, "entrepreneur", contractor);
      } else {
        addMessage("alex", detected.response, detected.intent, detected.data);
      }
    } else {
      const followUps = [
        "Pouvez-vous me préciser votre ville ?",
        "De quel type de propriété s'agit-il ?",
        "C'est noté. Quel est le niveau d'urgence ?",
        "Je comprends. Envoyez-moi une photo si possible.",
        "Dites-moi en plus. Quel type de travaux ?",
      ];
      addMessage("alex", followUps[Math.floor(Math.random() * followUps.length)]);
    }

    setIsThinking(false);
  }, [addMessage]);

  /** Handle file upload and trigger appropriate analysis */
  const handleFileUpload = useCallback(async (file: File, type: "photo" | "quote") => {
    const label = type === "photo" ? "📷 Photo envoyée" : "📄 Soumission envoyée";
    addMessage("user", `${label}: ${file.name}`);
    setIsThinking(true);
    audioEngine.play("thinking");

    await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));
    audioEngine.play("success");

    if (type === "photo") {
      // Randomly pick design or problem analysis
      const isDesign = Math.random() > 0.4;
      if (isDesign) {
        addMessage("alex", "J'ai analysé votre photo. Voici mes suggestions design.", "photo_design", MOCK_PHOTO_DESIGN);
      } else {
        addMessage("alex", "J'ai détecté un problème potentiel. Voici mon diagnostic.", "photo_problem", MOCK_PHOTO_PROBLEM);
      }
    } else {
      addMessage("alex", "Analyse de soumission terminée. Voici le verdict.", "quote_analysis", MOCK_QUOTE_ANALYSIS);
    }
    setIsThinking(false);
  }, [addMessage]);

  return { messages, isThinking, sendMessage, initialize, addMessage, handleFileUpload };
}
