/**
 * useAlexConversationLite — Drives the conversational homepage logic.
 * V3: Enforces conversation order via AlexConversationOrderEngine.
 * Flow: assess_problem → check_auth → complete_profile → request_address → run_match → show_result → fallback
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
import {
  type ConversationFlowState,
  type ConversationPhase,
  createInitialFlowState,
  detectProblemFromText,
  isProblemAssessmentComplete,
  resolveNextPhase,
  isQuestionBlocked,
} from "@/services/alexConversationOrderEngine";

interface IntentMatch {
  intent: InlineCardType;
  response: string;
  data?: any;
}

// Analysis-specific keywords (these bypass the flow for analysis features)
const ANALYSIS_KEYWORDS: Record<string, IntentMatch> = {
  "analyser mon entreprise": { intent: "business_analysis", response: "J'analyse votre entreprise. Voici les résultats.", data: MOCK_BUSINESS_ANALYSIS },
  "score entreprise": { intent: "business_analysis", response: "Voici l'analyse complète de votre positionnement.", data: MOCK_BUSINESS_ANALYSIS },
  "visibilité": { intent: "business_analysis", response: "Je vérifie votre visibilité en ligne.", data: MOCK_BUSINESS_ANALYSIS },
  "aipp": { intent: "aipp_score", response: "Voici votre score AIPP.", data: { entityName: MOCK_BUSINESS_ANALYSIS.entityName, score: MOCK_BUSINESS_ANALYSIS.aippScore, tier: "gold" } },
  "analyser soumission": { intent: "quote_analysis", response: "J'ai analysé votre soumission. Voici le verdict.", data: MOCK_QUOTE_ANALYSIS },
  "comparer soumission": { intent: "quote_analysis", response: "Analyse de soumission terminée.", data: MOCK_QUOTE_ANALYSIS },
};

function detectAnalysisIntent(text: string): IntentMatch | null {
  const lower = text.toLowerCase();
  const sorted = Object.entries(ANALYSIS_KEYWORDS).sort((a, b) => b[0].length - a[0].length);
  for (const [keyword, result] of sorted) {
    if (lower.includes(keyword)) return result;
  }
  return null;
}

export function useAlexConversationLite(userName?: string, isAuthenticated = false, hasAddress = false) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const idRef = useRef(0);
  const [flowState, setFlowState] = useState<ConversationFlowState>(() =>
    createInitialFlowState({
      isAuthenticated,
      firstName: userName || null,
      hasAddress,
      profileComplete: isAuthenticated && !!userName,
      missingFields: isAuthenticated ? (userName ? [] : ["first_name"]) : ["first_name", "phone"],
    })
  );

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
      ? `Bonjour ${userName}. Décrivez-moi votre besoin, je m'en occupe.`
      : "Bonjour. Je suis Alex, votre assistante UNPRO. Décrivez-moi votre besoin, je m'en occupe.";
    addMessage("alex", greeting);
    setFlowState(prev => ({
      ...prev,
      problem: { ...prev.problem, questionsAsked: 1 },
    }));
  }, [userName, addMessage]);

  const advanceFlow = useCallback((state: ConversationFlowState) => {
    const nextPhase = resolveNextPhase(state);
    
    // Auto-advance through phases that don't need user input
    if (nextPhase === "check_auth" && state.userContext.isAuthenticated) {
      return advanceFlow({ ...state, phase: "complete_profile" });
    }
    if (nextPhase === "complete_profile" && state.userContext.profileComplete) {
      return advanceFlow({ ...state, phase: "request_address" });
    }
    if (nextPhase === "request_address" && state.userContext.hasAddress) {
      return advanceFlow({ ...state, phase: "run_match" });
    }

    return { ...state, phase: nextPhase };
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    addMessage("user", text);
    setIsThinking(true);
    audioEngine.play("thinking");

    await new Promise(r => setTimeout(r, 600 + Math.random() * 500));

    // 1. Check for analysis intents (these bypass normal flow)
    const analysisIntent = detectAnalysisIntent(text);
    if (analysisIntent) {
      audioEngine.play("success");
      addMessage("alex", analysisIntent.response, analysisIntent.intent, analysisIntent.data);
      setIsThinking(false);
      return;
    }

    // 2. Process through conversation order engine
    let newState = { ...flowState };
    const currentPhase = resolveNextPhase(newState);

    switch (currentPhase) {
      case "assess_problem": {
        const detected = detectProblemFromText(text);
        if (detected) {
          newState.problem = {
            ...newState.problem,
            ...detected,
            questionsAsked: newState.problem.questionsAsked + 1,
          };
        } else {
          newState.problem.questionsAsked += 1;
        }

        // Check if assessment is now complete
        if (isProblemAssessmentComplete(newState.problem)) {
          newState.problem.assessmentComplete = true;
          
          // Show problem summary card
          audioEngine.play("success");
          addMessage("alex", "Compris, je note votre besoin.", "problem_summary" as InlineCardType, {
            problemType: newState.problem.problemType || "autre",
            projectType: newState.problem.projectType,
            urgency: newState.problem.urgencyLevel,
            summary: newState.problem.summary,
          });

          // Advance to next phase
          newState = advanceFlow(newState);
          const next = resolveNextPhase(newState);

          if (next === "check_auth" && !newState.userContext.isAuthenticated) {
            setTimeout(() => {
              addMessage("alex", "Pour continuer et sauvegarder votre dossier, connectez-vous ou créez votre compte gratuit.", "login_prompt");
            }, 800);
          } else if (next === "request_address") {
            setTimeout(() => {
              addMessage("alex", "Il me manque votre adresse pour chercher les meilleurs entrepreneurs près de chez vous.", "address_required" as InlineCardType);
            }, 800);
          } else if (next === "run_match") {
            setTimeout(() => {
              addMessage("alex", "Je m'en occupe. Je cherche le meilleur professionnel.");
              setTimeout(() => {
                const contractor = MOCK_CONTRACTORS[0];
                audioEngine.play("success");
                addMessage("alex", "J'ai trouvé la meilleure option.", "entrepreneur", contractor);
              }, 1200);
            }, 800);
            newState.matchAttempted = true;
            newState.matchFound = true;
          }
        } else {
          // Ask next assessment question (never ask city here!)
          const followUps = [
            "Est-ce un problème urgent ou un projet planifié ?",
            "De quel type de travaux s'agit-il exactement ?",
            "Depuis quand observez-vous ce problème ?",
            "Avez-vous une photo à me montrer ?",
            "Pouvez-vous me donner plus de détails ?",
          ];
          // Pick a non-blocked question
          let question = followUps[Math.min(newState.problem.questionsAsked - 1, followUps.length - 1)];
          if (isQuestionBlocked(question, newState)) {
            question = "Pouvez-vous me donner plus de détails ?";
          }
          addMessage("alex", question);
        }
        break;
      }

      case "check_auth": {
        // User interacted but isn't logged in — re-show login prompt
        addMessage("alex", "Connectez-vous pour continuer. C'est gratuit et prend 10 secondes.", "login_prompt");
        break;
      }

      case "complete_profile": {
        // Simulate profile field capture
        newState.userContext.profileComplete = true;
        newState.userContext.missingFields = [];
        addMessage("alex", "Merci ! Votre profil est à jour.");
        
        newState = advanceFlow(newState);
        const next = resolveNextPhase(newState);
        if (next === "request_address") {
          setTimeout(() => {
            addMessage("alex", "Il me manque votre adresse pour chercher les meilleurs entrepreneurs.", "address_required" as InlineCardType);
          }, 800);
        }
        break;
      }

      case "request_address": {
        // Simulate address capture from user text
        const lower = text.toLowerCase();
        const cities = ["montréal", "laval", "québec", "gatineau", "sherbrooke", "longueuil", "lévis"];
        const detected = cities.find(c => lower.includes(c));
        if (detected) {
          newState.userContext.hasAddress = true;
          newState.userContext.city = detected;
          addMessage("alex", `Parfait, ${detected}. Je cherche le meilleur professionnel dans votre secteur.`);
          
          // Auto-advance to match
          setTimeout(() => {
            const contractor = MOCK_CONTRACTORS[0];
            audioEngine.play("success");
            addMessage("alex", "J'ai trouvé la meilleure option.", "entrepreneur", contractor);
          }, 1200);
          newState.matchAttempted = true;
          newState.matchFound = true;
        } else {
          addMessage("alex", "Dans quelle ville êtes-vous situé ?");
        }
        break;
      }

      case "run_match":
      case "show_result": {
        // Already matched — handle follow-up intents
        const lower = text.toLowerCase();
        if (lower.includes("réserver") || lower.includes("rendez-vous") || lower.includes("disponibilité")) {
          addMessage("alex", "Voici les créneaux disponibles.", "availability");
        } else if (lower.includes("soumission") || lower.includes("devis")) {
          addMessage("alex", "Envoyez-moi votre soumission, je l'analyse immédiatement.", "upload_quote");
        } else if (lower.includes("photo")) {
          addMessage("alex", "Envoyez-moi une photo, j'analyse immédiatement.", "upload_photo");
        } else {
          addMessage("alex", "On bloque un rendez-vous ? Je vous montre les créneaux disponibles.", "availability");
        }
        break;
      }

      case "fallback": {
        addMessage("alex", "Je surveille et je vous avertis dès qu'un professionnel est disponible.", "no_match");
        break;
      }
    }

    setFlowState(newState);
    setIsThinking(false);
  }, [addMessage, flowState, advanceFlow]);

  /** Handle file upload and trigger appropriate analysis */
  const handleFileUpload = useCallback(async (file: File, type: "photo" | "quote") => {
    const label = type === "photo" ? "📷 Photo envoyée" : "📄 Soumission envoyée";
    addMessage("user", `${label}: ${file.name}`);
    setIsThinking(true);
    audioEngine.play("thinking");

    // Mark assessment accordingly
    setFlowState(prev => ({
      ...prev,
      problem: {
        ...prev.problem,
        hasPhoto: type === "photo" ? true : prev.problem.hasPhoto,
        hasQuote: type === "quote" ? true : prev.problem.hasQuote,
        assessmentComplete: true,
      },
    }));

    await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));
    audioEngine.play("success");

    if (type === "photo") {
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

  /** Update auth state (e.g. after login) */
  const updateAuthState = useCallback((authenticated: boolean, name?: string) => {
    setFlowState(prev => ({
      ...prev,
      userContext: {
        ...prev.userContext,
        isAuthenticated: authenticated,
        firstName: name || prev.userContext.firstName,
        profileComplete: authenticated && !!name,
        missingFields: authenticated ? (name ? [] : ["first_name"]) : ["first_name", "phone"],
      },
      resumedAfterAuth: authenticated,
    }));

    if (authenticated && name) {
      addMessage("alex", `Content de vous retrouver, ${name}. On reprend où on en était.`);
      
      // Auto-advance from auth
      setFlowState(prev => {
        const next = advanceFlow(prev);
        const phase = resolveNextPhase(next);
        if (phase === "request_address" && !prev.userContext.hasAddress) {
          setTimeout(() => {
            addMessage("alex", "Il me manque votre adresse pour chercher les meilleurs entrepreneurs.", "address_required" as InlineCardType);
          }, 800);
        } else if (phase === "run_match") {
          setTimeout(() => {
            const contractor = MOCK_CONTRACTORS[0];
            audioEngine.play("success");
            addMessage("alex", "J'ai trouvé la meilleure option.", "entrepreneur", contractor);
          }, 800);
        }
        return next;
      });
    }
  }, [addMessage, advanceFlow]);

  return {
    messages,
    isThinking,
    sendMessage,
    initialize,
    addMessage,
    handleFileUpload,
    flowState,
    currentPhase: resolveNextPhase(flowState),
    updateAuthState,
  };
}
