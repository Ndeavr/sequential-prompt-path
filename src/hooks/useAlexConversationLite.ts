/**
 * useAlexConversationLite — V4: Strict Conversation Guards
 * 
 * GUARDS ENFORCED:
 * - Single welcome per session (welcomeSentRef)
 * - No city/address questions before problem assessment
 * - No internal/technical text in user-facing messages (contentSanitizer)
 * - Strict phase sequencing via state machine
 * - No duplicate messages (dedup check)
 * - Login only after problem assessment
 * - Address only when operationally needed
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
} from "@/services/alexConversationOrderEngine";

// ─── INTERNAL LEAK DETECTOR ───
// Any message containing these patterns MUST be suppressed from the user chat.
const INTERNAL_LEAK_PATTERNS = [
  /build\s+(conversation|new|inline|state|cards|hook|page|module|component)/i,
  /update\s+(conversation|hook|page|component|state)/i,
  /exploring\s+module/i,
  /task\s*(tracking|list|status|created|done|in_progress)/i,
  /checklist\s+technique/i,
  /migration\s+(tool|sql|database)/i,
  /supabase\s+(table|migration|schema)/i,
  /lovable\s+(tagger|build|deploy)/i,
  /\btodo\b.*\btask\b/i,
  /creating\s+file/i,
  /writing\s+(code|file|component)/i,
  /implementing\s+(the|a|an)\s/i,
  /^(Task|Step)\s+\d+/,
  /RLS\s+polic/i,
  /edge\s+function/i,
];

function isInternalContent(text: string): boolean {
  return INTERNAL_LEAK_PATTERNS.some(p => p.test(text));
}

// ─── DUPLICATE DETECTOR ───
function isDuplicateMessage(messages: ConversationMessage[], content: string, role: string): boolean {
  if (messages.length === 0) return false;
  const last = messages[messages.length - 1];
  return last.role === role && last.content === content;
}

// ─── ANALYSIS KEYWORDS ───
interface IntentMatch {
  intent: InlineCardType;
  response: string;
  data?: any;
}

const ANALYSIS_KEYWORDS: Record<string, IntentMatch> = {
  "analyser mon entreprise": { intent: "business_analysis", response: "J'analyse votre entreprise. Voici les résultats.", data: MOCK_BUSINESS_ANALYSIS },
  "score entreprise": { intent: "business_analysis", response: "Voici l'analyse complète de votre positionnement.", data: MOCK_BUSINESS_ANALYSIS },
  "visibilité": { intent: "business_analysis", response: "Je vérifie votre visibilité en ligne.", data: MOCK_BUSINESS_ANALYSIS },
  "aipp": { intent: "aipp_score", response: "Voici votre score AIPP.", data: { entityName: MOCK_BUSINESS_ANALYSIS.entityName, score: MOCK_BUSINESS_ANALYSIS.aippScore, tier: "gold" } },
  "analyser soumission": { intent: "quote_analysis", response: "J'ai analysé votre soumission. Voici le verdict.", data: MOCK_QUOTE_ANALYSIS },
  "comparer soumission": { intent: "quote_analysis", response: "Analyse de soumission terminée.", data: MOCK_QUOTE_ANALYSIS },
};

// ─── ORCHESTRATOR KEYWORDS (V1) ───
const ORCHESTRATOR_KEYWORDS: Record<string, IntentMatch> = {
  "compléter mon profil": { intent: "inline_form", response: "Je peux compléter votre profil ici. Vérifiez simplement ces informations.", data: { formKey: "profile", title: "Compléter votre profil", fields: [{ key: "firstName", label: "Prénom", type: "text", placeholder: "Votre prénom", required: true }, { key: "phone", label: "Téléphone", type: "phone", placeholder: "(514) 000-0000" }, { key: "email", label: "Courriel", type: "email", placeholder: "vous@example.com" }], submitLabel: "Enregistrer" } },
  "trouver un pro": { intent: "contractor_picker", response: "Voici les meilleurs professionnels pour votre projet.", data: { contractors: MOCK_CONTRACTORS, reason: "Sélectionnés selon votre besoin et votre secteur." } },
  "chercher un professionnel": { intent: "contractor_picker", response: "J'ai trouvé ces professionnels qualifiés pour vous.", data: { contractors: MOCK_CONTRACTORS, reason: "Basé sur votre demande et la disponibilité." } },
  "réserver un rendez-vous": { intent: "booking_scheduler", response: "Voici les disponibilités. Choisissez le créneau qui vous convient.", data: { contractorId: "c1", contractorName: MOCK_CONTRACTORS[0].name, slots: MOCK_SLOTS, appointmentType: "évaluation" } },
  "planifier": { intent: "booking_scheduler", response: "Je peux planifier un rendez-vous. Voici les créneaux disponibles.", data: { contractorId: "c1", contractorName: MOCK_CONTRACTORS[0].name, slots: MOCK_SLOTS } },
  "activer mon plan": { intent: "checkout_embedded", response: "Je peux finaliser votre activation ici.", data: { planCode: "pro", planName: "Pro", price: 149, interval: "monthly" } },
  "paiement": { intent: "checkout_embedded", response: "Voici le résumé de votre plan. Procédez au paiement.", data: { planCode: "pro", planName: "Pro", price: 149, interval: "monthly" } },
  "avant après": { intent: "before_after", response: "Je génère un avant/après de votre espace.", data: { beforeUrl: "/placeholder.svg", generating: true, roomType: "Cuisine" } },
  "transformation": { intent: "before_after", response: "Voici une transformation possible.", data: { beforeUrl: "/placeholder.svg", afterUrl: "/placeholder.svg", roomType: "Salon", style: "Moderne minimaliste" } },
  "inspirations": { intent: "image_gallery", response: "Voici quelques inspirations pour votre projet.", data: { title: "Inspirations", images: [{ url: "/placeholder.svg", label: "Moderne" }, { url: "/placeholder.svg", label: "Scandinave" }, { url: "/placeholder.svg", label: "Industriel" }] } },
  "confirmer adresse": { intent: "address_confirmation", response: "C'est bien pour cette adresse ?", data: { address: "1234 rue Principale", city: "Laval", postalCode: "H7N 1A1", propertyType: "Condo" } },
  "mon adresse": { intent: "address_confirmation", response: "Je retrouve votre adresse. Confirmez-la.", data: { address: "1234 rue Principale", city: "Laval", postalCode: "H7N 1A1" } },
};

function detectAnalysisIntent(text: string): IntentMatch | null {
  const lower = text.toLowerCase();
  // Check orchestrator keywords first (higher specificity)
  const orchSorted = Object.entries(ORCHESTRATOR_KEYWORDS).sort((a, b) => b[0].length - a[0].length);
  for (const [keyword, result] of orchSorted) {
    if (lower.includes(keyword)) return result;
  }
  const sorted = Object.entries(ANALYSIS_KEYWORDS).sort((a, b) => b[0].length - a[0].length);
  for (const [keyword, result] of sorted) {
    if (lower.includes(keyword)) return result;
  }
  return null;
}

// ─── ASSESSMENT FOLLOW-UP QUESTIONS ───
// These are the ONLY questions Alex can ask during problem assessment.
// NEVER includes city, address, postal code, or location.
const ASSESSMENT_QUESTIONS = [
  "Est-ce un problème urgent ou un projet planifié ?",
  "De quel type de travaux s'agit-il exactement ?",
  "Depuis quand observez-vous ce problème ?",
  "Avez-vous une photo à me montrer ?",
  "Pouvez-vous me donner plus de détails ?",
];

export function useAlexConversationLite(userName?: string, isAuthenticated = false, hasAddress = false) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const idRef = useRef(0);
  const welcomeSentRef = useRef(false); // GUARD: single welcome
  const [flowState, setFlowState] = useState<ConversationFlowState>(() =>
    createInitialFlowState({
      isAuthenticated,
      firstName: userName || null,
      hasAddress,
      profileComplete: isAuthenticated && !!userName,
      missingFields: isAuthenticated ? (userName ? [] : ["first_name"]) : ["first_name", "phone"],
    })
  );

  // ─── SAFE MESSAGE EMITTER ───
  // Every message to the user goes through this. Internal content is blocked.
  const emitSafe = useCallback((
    role: ConversationMessage["role"],
    content: string,
    cardType?: InlineCardType,
    cardData?: any,
  ) => {
    // GUARD: block internal content
    if (role === "alex" && isInternalContent(content)) {
      console.warn("[AlexGuard] Blocked internal leak:", content.substring(0, 60));
      return null;
    }
    // GUARD: block empty messages
    if (role === "alex" && !content.trim() && !cardType) return null;

    // GUARD: block duplicates
    if (isDuplicateMessage(messages, content, role)) {
      console.warn("[AlexGuard] Blocked duplicate:", content.substring(0, 40));
      return null;
    }

    const msg: ConversationMessage = {
      id: `msg-${++idRef.current}`,
      role,
      content,
      cardType,
      cardData,
      timestamp: Date.now(),
    };
    setMessages(prev => {
      // Double-check dedup against latest state
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        if (last.role === role && last.content === content) return prev;
      }
      return [...prev, msg];
    });
    return msg;
  }, [messages]);

  // ─── INITIALIZE (welcome guard) ───
  const initialize = useCallback(() => {
    // GUARD: never send welcome twice
    if (welcomeSentRef.current) return;
    welcomeSentRef.current = true;

    const greeting = userName
      ? `Bonjour ${userName}. Décrivez-moi votre besoin, je m'en occupe.`
      : "Bonjour. Je suis Alex, votre assistante UNPRO. Décrivez-moi votre besoin, je m'en occupe.";
    emitSafe("alex", greeting);
    setFlowState(prev => ({
      ...prev,
      problem: { ...prev.problem, questionsAsked: 1 },
    }));
  }, [userName, emitSafe]);

  // ─── FLOW ADVANCER ───
  const advanceFlow = useCallback((state: ConversationFlowState): ConversationFlowState => {
    const nextPhase = resolveNextPhase(state);
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

  // ─── EXECUTE MATCH ───
  const executeMatch = useCallback((state: ConversationFlowState) => {
    emitSafe("alex", "Je m'en occupe. Je cherche le meilleur professionnel.");
    setTimeout(() => {
      const contractor = MOCK_CONTRACTORS[0];
      audioEngine.play("success");
      emitSafe("alex", "J'ai trouvé la meilleure option.", "entrepreneur", contractor);
    }, 1200);
    return { ...state, matchAttempted: true, matchFound: true };
  }, [emitSafe]);

  // ─── SEND MESSAGE ───
  const sendMessage = useCallback(async (text: string) => {
    emitSafe("user", text);
    setIsThinking(true);
    audioEngine.play("thinking");

    await new Promise(r => setTimeout(r, 600 + Math.random() * 500));

    // 1. Analysis intents bypass normal flow
    const analysisIntent = detectAnalysisIntent(text);
    if (analysisIntent) {
      audioEngine.play("success");
      emitSafe("alex", analysisIntent.response, analysisIntent.intent, analysisIntent.data);
      setIsThinking(false);
      return;
    }

    // 2. State machine routing
    let newState = { ...flowState };
    const currentPhase = resolveNextPhase(newState);

    switch (currentPhase) {
      case "assess_problem": {
        const detected = detectProblemFromText(text);
        if (detected) {
          newState.problem = { ...newState.problem, ...detected, questionsAsked: newState.problem.questionsAsked + 1 };
        } else {
          newState.problem.questionsAsked += 1;
        }

        if (isProblemAssessmentComplete(newState.problem)) {
          newState.problem.assessmentComplete = true;
          audioEngine.play("success");
          emitSafe("alex", "Compris, je note votre besoin.", "problem_summary", {
            problemType: newState.problem.problemType || "autre",
            projectType: newState.problem.projectType,
            urgency: newState.problem.urgencyLevel,
            summary: newState.problem.summary,
          });

          newState = advanceFlow(newState);
          const next = resolveNextPhase(newState);

          if (next === "check_auth" && !newState.userContext.isAuthenticated) {
            setTimeout(() => {
              emitSafe("alex", "Pour continuer et sauvegarder votre dossier, connectez-vous ou créez votre compte gratuit.", "login_prompt");
            }, 800);
          } else if (next === "request_address") {
            setTimeout(() => {
              emitSafe("alex", "Il me manque votre adresse pour chercher les meilleurs entrepreneurs près de chez vous.", "address_required" as InlineCardType);
            }, 800);
          } else if (next === "run_match") {
            setTimeout(() => {
              newState = executeMatch(newState);
              setFlowState(newState);
            }, 800);
          }
        } else {
          // GUARD: only ask from approved assessment questions list
          const qIdx = Math.min(newState.problem.questionsAsked - 1, ASSESSMENT_QUESTIONS.length - 1);
          emitSafe("alex", ASSESSMENT_QUESTIONS[qIdx]);
        }
        break;
      }

      case "check_auth": {
        emitSafe("alex", "Connectez-vous pour continuer. C'est gratuit et prend 10 secondes.", "login_prompt");
        break;
      }

      case "complete_profile": {
        newState.userContext.profileComplete = true;
        newState.userContext.missingFields = [];
        emitSafe("alex", "Merci ! Votre profil est à jour.");
        newState = advanceFlow(newState);
        const next = resolveNextPhase(newState);
        if (next === "request_address") {
          setTimeout(() => {
            emitSafe("alex", "Il me manque votre adresse pour chercher les meilleurs entrepreneurs.", "address_required" as InlineCardType);
          }, 800);
        }
        break;
      }

      case "request_address": {
        const lower = text.toLowerCase();
        const cities = ["montréal", "montreal", "laval", "québec", "quebec", "gatineau", "sherbrooke", "longueuil", "lévis", "levis", "trois-rivières", "drummondville", "saint-jean", "rimouski"];
        const detected = cities.find(c => lower.includes(c));
        if (detected) {
          newState.userContext.hasAddress = true;
          newState.userContext.city = detected;
          emitSafe("alex", `Parfait, ${detected}. Je cherche le meilleur professionnel dans votre secteur.`);
          setTimeout(() => {
            newState = executeMatch(newState);
            setFlowState(newState);
          }, 400);
        } else {
          emitSafe("alex", "Dans quelle ville se situe votre propriété ?");
        }
        break;
      }

      case "run_match":
      case "show_result": {
        const lower = text.toLowerCase();
        if (lower.includes("réserver") || lower.includes("rendez-vous") || lower.includes("disponibilité")) {
          emitSafe("alex", "Voici les créneaux disponibles.", "availability");
        } else if (lower.includes("soumission") || lower.includes("devis")) {
          emitSafe("alex", "Envoyez-moi votre soumission, je l'analyse immédiatement.", "upload_quote");
        } else if (lower.includes("photo")) {
          emitSafe("alex", "Envoyez-moi une photo, j'analyse immédiatement.", "upload_photo");
        } else {
          emitSafe("alex", "On bloque un rendez-vous ? Je vous montre les créneaux disponibles.", "availability");
        }
        break;
      }

      case "fallback": {
        emitSafe("alex", "Je surveille et je vous avertis dès qu'un professionnel est disponible.", "no_match");
        break;
      }
    }

    setFlowState(newState);
    setIsThinking(false);
  }, [emitSafe, flowState, advanceFlow, executeMatch]);

  // ─── FILE UPLOAD ───
  const handleFileUpload = useCallback(async (file: File, type: "photo" | "quote") => {
    const label = type === "photo" ? "📷 Photo envoyée" : "📄 Soumission envoyée";
    emitSafe("user", `${label}: ${file.name}`);
    setIsThinking(true);
    audioEngine.play("thinking");

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
        emitSafe("alex", "J'ai analysé votre photo. Voici mes suggestions design.", "photo_design", MOCK_PHOTO_DESIGN);
      } else {
        emitSafe("alex", "J'ai détecté un problème potentiel. Voici mon diagnostic.", "photo_problem", MOCK_PHOTO_PROBLEM);
      }
    } else {
      emitSafe("alex", "Analyse de soumission terminée. Voici le verdict.", "quote_analysis", MOCK_QUOTE_ANALYSIS);
    }
    setIsThinking(false);
  }, [emitSafe]);

  // ─── AUTH STATE UPDATE (resume after login) ───
  const updateAuthState = useCallback((authenticated: boolean, name?: string) => {
    setFlowState(prev => {
      const updated: ConversationFlowState = {
        ...prev,
        userContext: {
          ...prev.userContext,
          isAuthenticated: authenticated,
          firstName: name || prev.userContext.firstName,
          profileComplete: authenticated && !!name,
          missingFields: authenticated ? (name ? [] : ["first_name"]) : ["first_name", "phone"],
        },
        resumedAfterAuth: authenticated,
      };

      if (authenticated && name) {
        // GUARD: only emit resume message, never re-welcome
        emitSafe("alex", `Content de vous retrouver, ${name}. On reprend où on en était.`);

        const advanced = advanceFlow(updated);
        const phase = resolveNextPhase(advanced);
        if (phase === "request_address" && !updated.userContext.hasAddress) {
          setTimeout(() => {
            emitSafe("alex", "Il me manque votre adresse pour chercher les meilleurs entrepreneurs.", "address_required" as InlineCardType);
          }, 800);
        } else if (phase === "run_match") {
          setTimeout(() => {
            emitSafe("alex", "Je m'en occupe. Je cherche le meilleur professionnel.");
            setTimeout(() => {
              const contractor = MOCK_CONTRACTORS[0];
              audioEngine.play("success");
              emitSafe("alex", "J'ai trouvé la meilleure option.", "entrepreneur", contractor);
            }, 1200);
          }, 800);
        }
        return advanced;
      }
      return updated;
    });
  }, [emitSafe, advanceFlow]);

  return {
    messages,
    isThinking,
    sendMessage,
    initialize,
    handleFileUpload,
    flowState,
    currentPhase: resolveNextPhase(flowState),
    updateAuthState,
  };
}
