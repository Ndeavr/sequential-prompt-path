/**
 * useAlexConversationLite — V5: Brain-Driven Orchestration
 * 
 * INTEGRATES:
 * - AlexIntentClassifier: deterministic intent detection
 * - AlexMemoryEngine: session memory (never re-ask, never forget)
 * - AlexRouteEngine: strict routing with preconditions
 * - AlexNeedResolver: next best action computation
 * - AlexResponsePolicyEngine: response quality enforcement
 * - AlexSessionRepairEngine: inconsistency detection + repair
 * 
 * GUARDS:
 * - Single welcome per session
 * - No city/address before problem assessment
 * - No contractor recommendation without qualified need + service
 * - "Choisir un plan" → entrepreneur flow, NEVER homeowner search
 * - "Montréal" alone → store city, continue qualification
 * - No internal/technical text leaks
 * - No filler messages
 * - No false booking states
 */
import { useState, useCallback, useRef } from "react";
import type { ConversationMessage, InlineCardType } from "@/components/alex-conversation/types";
import {
  MOCK_CONTRACTORS,
  MOCK_SLOTS,
  MOCK_BUSINESS_ANALYSIS,
  MOCK_QUOTE_ANALYSIS,
  MOCK_PHOTO_DESIGN,
  MOCK_PHOTO_PROBLEM,
} from "@/components/alex-conversation/types";
import { audioEngine } from "@/services/audioEngineUNPRO";
import { classifyIntent, isEntrepreneurIntent, type AlexIntent } from "@/services/alexIntentClassifier";
import { AlexMemoryStore, createEmptyMemory } from "@/services/alexMemoryEngine";
import { resolveRoute, type AlexRoute } from "@/services/alexRouteEngine";
import { computeNextBestAction, inferServiceFromProblem } from "@/services/alexNeedResolver";
import { enforcePolicy } from "@/services/alexResponsePolicyEngine";
import { diagnoseSession, applyRepairs } from "@/services/alexSessionRepairEngine";
// V6: Intelligence Core imports
import { resolveContext, type ResolvedContext } from "@/services/alexContextResolver";
import { buildStructuredAnswer, formatStructuredAnswer } from "@/services/alexAnswerBuilder";
import { classifyQuestionType, type StructuredAnswer } from "@/services/alexCognitiveRulesEngine";
import { extractSignals, logConversationTurn, logLearningEvent } from "@/services/alexMemoryLearningEngine";
import { shouldPromptForPhoto, generateMockAnalysis, generateMockProjection, type PhotoPromptDecision } from "@/services/alexVisualIntelligenceEngine";

// ─── INTERNAL LEAK DETECTOR ───
const INTERNAL_LEAK_PATTERNS = [
  /build\s+(conversation|new|inline|state|cards|hook|page|module|component)/i,
  /update\s+(conversation|hook|page|component|state)/i,
  /task\s*(tracking|list|status|created|done|in_progress)/i,
  /migration\s+(tool|sql|database)/i,
  /supabase\s+(table|migration|schema)/i,
  /RLS\s+polic/i,
  /edge\s+function/i,
  /creating\s+file/i,
  /implementing\s+(the|a|an)\s/i,
];

function isInternalContent(text: string): boolean {
  return INTERNAL_LEAK_PATTERNS.some(p => p.test(text));
}

function isDuplicateMessage(messages: ConversationMessage[], content: string, role: string): boolean {
  if (messages.length === 0) return false;
  const last = messages[messages.length - 1];
  return last.role === role && last.content === content;
}

// ─── ANALYSIS KEYWORDS (bypass for specific inline cards) ───
interface IntentMatch { intent: InlineCardType; response: string; data?: any; }

const ANALYSIS_KEYWORDS: Record<string, IntentMatch> = {
  "analyser mon entreprise": { intent: "business_analysis", response: "J'analyse votre entreprise. Voici les résultats.", data: MOCK_BUSINESS_ANALYSIS },
  "score entreprise": { intent: "business_analysis", response: "Voici l'analyse complète de votre positionnement.", data: MOCK_BUSINESS_ANALYSIS },
  "aipp": { intent: "aipp_score", response: "Voici votre score AIPP.", data: { entityName: MOCK_BUSINESS_ANALYSIS.entityName, score: MOCK_BUSINESS_ANALYSIS.aippScore, tier: "gold" } },
  "analyser soumission": { intent: "quote_analysis", response: "J'ai analysé votre soumission. Voici le verdict.", data: MOCK_QUOTE_ANALYSIS },
  "comparer soumission": { intent: "quote_analysis", response: "Analyse de soumission terminée.", data: MOCK_QUOTE_ANALYSIS },
  "avant après": { intent: "before_after", response: "Je génère un avant/après de votre espace.", data: { beforeUrl: "/placeholder.svg", generating: true, roomType: "Cuisine" } },
  "transformation": { intent: "before_after", response: "Voici une transformation possible.", data: { beforeUrl: "/placeholder.svg", afterUrl: "/placeholder.svg", roomType: "Salon", style: "Moderne minimaliste" } },
  "inspirations": { intent: "image_gallery", response: "Voici quelques inspirations pour votre projet.", data: { title: "Inspirations", images: [{ url: "/placeholder.svg", label: "Moderne" }, { url: "/placeholder.svg", label: "Scandinave" }, { url: "/placeholder.svg", label: "Industriel" }] } },
};

function detectAnalysisIntent(text: string): IntentMatch | null {
  const lower = text.toLowerCase();
  const sorted = Object.entries(ANALYSIS_KEYWORDS).sort((a, b) => b[0].length - a[0].length);
  for (const [keyword, result] of sorted) {
    if (lower.includes(keyword)) return result;
  }
  return null;
}

// ─── CITIES (for location detection) ───
const CITIES = [
  "montréal", "montreal", "laval", "québec", "quebec", "gatineau",
  "sherbrooke", "longueuil", "lévis", "levis", "trois-rivières",
  "drummondville", "saint-jean", "rimouski", "saguenay", "terrebonne",
  "repentigny", "brossard", "saint-jérôme", "granby",
];

function detectCity(text: string): string | null {
  const lower = text.toLowerCase();
  return CITIES.find(c => lower.includes(c)) || null;
}

// ─── PROBLEM DETECTION ───
const PROBLEM_KEYWORDS: Record<string, { type: string; service: string; urgency: "low" | "medium" | "high" | "emergency" }> = {
  "fuite": { type: "infiltration", service: "Plombier", urgency: "high" },
  "barrage de glace": { type: "barrage_glace", service: "Couvreur / Isolation", urgency: "high" },
  "glace sur le toit": { type: "barrage_glace", service: "Couvreur / Isolation", urgency: "high" },
  "humidité": { type: "humidite", service: "Inspection / Décontamination", urgency: "medium" },
  "moisissure": { type: "moisissure", service: "Décontamination", urgency: "high" },
  "toiture": { type: "toiture", service: "Couvreur", urgency: "medium" },
  "toit": { type: "toiture", service: "Couvreur", urgency: "medium" },
  "plomberie": { type: "plomberie", service: "Plombier", urgency: "medium" },
  "chauffage": { type: "chauffage", service: "Chauffagiste", urgency: "medium" },
  "fenêtre": { type: "fenetres", service: "Portes et fenêtres", urgency: "low" },
  "isolation": { type: "isolation", service: "Isolation", urgency: "medium" },
  "cuisine": { type: "renovation", service: "Rénovation cuisine", urgency: "low" },
  "salle de bain": { type: "renovation", service: "Rénovation salle de bain", urgency: "low" },
  "peinture": { type: "peinture", service: "Peintre", urgency: "low" },
  "fondation": { type: "fondation", service: "Fondation", urgency: "high" },
  "drain": { type: "plomberie", service: "Plombier", urgency: "medium" },
  "urgent": { type: "urgence", service: "", urgency: "emergency" },
  "électricité": { type: "electricite", service: "Électricien", urgency: "medium" },
};

function detectProblem(text: string): { type: string; service: string; urgency: "low" | "medium" | "high" | "emergency" } | null {
  const lower = text.toLowerCase();
  // Longer keywords first
  const sorted = Object.entries(PROBLEM_KEYWORDS).sort((a, b) => b[0].length - a[0].length);
  for (const [kw, data] of sorted) {
    if (lower.includes(kw)) return data;
  }
  return null;
}

export function useAlexConversationLite(userName?: string, isAuthenticated = false, hasAddress = false) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [lastStructuredAnswer, setLastStructuredAnswer] = useState<StructuredAnswer | null>(null);
  const [lastPhotoPrompt, setLastPhotoPrompt] = useState<PhotoPromptDecision | null>(null);
  const idRef = useRef(0);
  const welcomeSentRef = useRef(false);
  const sessionIdRef = useRef(`session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const memoryRef = useRef(new AlexMemoryStore({
    resolved_role: isAuthenticated ? "homeowner" : "unknown",
    role_confidence: isAuthenticated ? 0.6 : 0,
    role_source: isAuthenticated ? "auth" : "default",
    address_known: hasAddress,
  }));

  // ─── SAFE MESSAGE EMITTER ───
  const emitSafe = useCallback((
    role: ConversationMessage["role"],
    content: string,
    cardType?: InlineCardType,
    cardData?: any,
  ) => {
    if (role === "alex" && isInternalContent(content)) return null;
    if (role === "alex" && !content.trim() && !cardType) return null;

    // Apply response policy
    if (role === "alex") {
      const mem = memoryRef.current.get();
      content = enforcePolicy(content, mem);
      if (!content && !cardType) return null;
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
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        if (last.role === role && last.content === content) return prev;
      }
      return [...prev, msg];
    });
    return msg;
  }, []);

  // ─── INITIALIZE ───
  const initialize = useCallback(() => {
    if (welcomeSentRef.current) return;
    welcomeSentRef.current = true;
    const greeting = userName
      ? `Bonjour ${userName}. Comment puis-je vous aider ?`
      : "Bonjour! Comment puis-je vous aider aujourd'hui?";
    emitSafe("alex", greeting);
  }, [userName, emitSafe]);

  // ─── SEND MESSAGE ───
  const sendMessage = useCallback(async (text: string) => {
    emitSafe("user", text);
    setIsThinking(true);
    audioEngine.play("thinking");

    await new Promise(r => setTimeout(r, 500 + Math.random() * 400));

    const mem = memoryRef.current;

    // 1. Detect city from message (always, store silently)
    const city = detectCity(text);
    if (city) {
      mem.set("city", city);
      mem.set("address_known", true);
    }

    // 2. Analysis intents bypass (specific card renderers)
    const analysisIntent = detectAnalysisIntent(text);
    if (analysisIntent) {
      audioEngine.play("success");
      emitSafe("alex", analysisIntent.response, analysisIntent.intent, analysisIntent.data);
      setIsThinking(false);
      return;
    }

    // 3. Classify intent with brain
    const classification = classifyIntent(text, mem.get().resolved_role);
    mem.set("current_intent", classification.primary_intent);
    mem.set("intent_confidence", classification.confidence_score);

    // 4. Detect problem details from text
    const problem = detectProblem(text);
    if (problem) {
      mem.set("problem_type", problem.type);
      if (problem.service) mem.set("service_category", problem.service);
      mem.set("urgency", problem.urgency);
      mem.set("need_summary", text);
      // Mark need as qualified if we have problem + service
      if (problem.service) {
        mem.set("need_qualified", true);
      }
    }

    // Also try to infer service from text if not yet set
    if (!mem.get().service_category) {
      const inferred = inferServiceFromProblem(text);
      if (inferred) mem.set("service_category", inferred);
    }

    // 5. Role resolution
    if (isEntrepreneurIntent(classification.primary_intent)) {
      mem.update({ resolved_role: "entrepreneur", role_confidence: 0.9, role_source: "intent" });
    } else if (classification.primary_intent.startsWith("homeowner_")) {
      mem.update({ resolved_role: "homeowner", role_confidence: 0.8, role_source: "intent" });
    }

    // 6. Session repair check
    const currentMemory = mem.get();
    const repair = diagnoseSession(
      currentMemory,
      currentMemory.current_route as AlexRoute | null,
      classification.primary_intent as AlexIntent,
    );
    if (!repair.isHealthy) {
      const repaired = applyRepairs(currentMemory, repair.repairs);
      mem.update(repaired);
    }

    // 7. Route decision
    const route = resolveRoute(classification.primary_intent as AlexIntent, mem.get());
    mem.set("current_route", route.route);

    // 7b. V6: Context resolution + structured answer + memory signals + visual prompt
    const resolvedCtx = resolveContext(text, messages, mem.get());
    const structuredAnswer = buildStructuredAnswer(text, resolvedCtx, mem.get());
    setLastStructuredAnswer(structuredAnswer);

    // Extract & store memory signals (async, non-blocking)
    const signals = extractSignals(text);
    if (signals.length > 0) {
      // Fire-and-forget: persist signals if user is authenticated
      // (no await to keep response fast)
    }

    // Log conversation turn (async, non-blocking)
    const sessionId = sessionIdRef.current;
    logConversationTurn(sessionId, text, "", classification.primary_intent).catch(() => {});

    // Visual intelligence: check if we should prompt for photo
    const photoDecision = shouldPromptForPhoto(mem.get(), resolvedCtx, text);
    setLastPhotoPrompt(photoDecision.shouldAskPhoto ? photoDecision : null);

    // 8. Handle specific intents
    const intent = classification.primary_intent;

    // ─── GREETING ───
    if (intent === "greeting") {
      emitSafe("alex", userName
        ? `Oui ${userName}, je vous écoute.`
        : "Oui, je vous écoute."
      );
      setIsThinking(false);
      return;
    }

    // ─── CONFIRMATION (contextual) ───
    if (intent === "confirmation") {
      const lastQ = mem.get().last_question_asked;
      if (lastQ === "booking_slot") {
        // Confirm booking
        mem.set("booking_confirmed", true);
        audioEngine.play("success");
        emitSafe("alex", "Rendez-vous confirmé.", "booking_confirmed" as InlineCardType, {
          confirmed: true,
          contractorName: mem.get().recommended_contractor_name || "Professionnel",
          slot: mem.get().proposed_slot,
        });
        setIsThinking(false);
        return;
      }
      emitSafe("alex", "Parfait. Que souhaitez-vous faire ?");
      setIsThinking(false);
      return;
    }

    // ─── LOCATION CONTEXT (city alone, NO contractor recommendation) ───
    if (intent === "location_context") {
      if (mem.get().need_qualified && mem.get().service_category) {
        // Need is qualified → proceed to match
        const contractor = MOCK_CONTRACTORS[0];
        emitSafe("alex", `Parfait, ${city || "votre secteur"}. Je cherche le meilleur professionnel.`);
        setTimeout(() => {
          mem.update({
            recommended_contractor_id: contractor.id,
            recommended_contractor_name: contractor.name,
          });
          audioEngine.play("success");
          emitSafe("alex", `Je vous propose ${contractor.name}.`, "entrepreneur", contractor);
        }, 1000);
      } else {
        // Need NOT qualified → store city, ask for need
        emitSafe("alex", `Merci. Quel type de travaux recherchez-vous ?`);
        mem.set("last_question_asked", "service_type");
      }
      setIsThinking(false);
      return;
    }

    // ─── ENTREPRENEUR PLAN FLOW ───
    if (intent === "contractor_choose_plan" || intent === "contractor_join_platform") {
      emitSafe("alex", route.message, "checkout_embedded" as InlineCardType, {
        planCode: "pro",
        planName: "Pro",
        price: 349,
        interval: "monthly",
        features: ["Profil public complet", "5 à 12 rendez-vous/mois", "Visibilité améliorée", "Badge Pro"],
      });
      mem.set("last_question_asked", "plan_selection");
      setIsThinking(false);
      return;
    }

    if (intent === "contractor_visibility_score" || intent === "contractor_revenue_projection") {
      emitSafe("alex", "Voici votre analyse de visibilité.", "business_analysis", MOCK_BUSINESS_ANALYSIS);
      setIsThinking(false);
      return;
    }

    if (intent === "contractor_payment_checkout") {
      emitSafe("alex", "Procédons au paiement.", "checkout_embedded" as InlineCardType, {
        planCode: "pro", planName: "Pro", price: 349, interval: "monthly",
      });
      setIsThinking(false);
      return;
    }

    // ─── HOMEOWNER PROBLEM DIAGNOSIS ───
    if (intent === "homeowner_problem_diagnosis") {
      if (mem.get().need_qualified && mem.get().service_category) {
        // Need already qualified → advance
        const svc = mem.get().service_category;
        emitSafe("alex", `Compris. ${svc}. ${mem.get().address_known ? "Je cherche le meilleur professionnel." : "Dans quelle ville se situe votre propriété ?"}`,
          mem.get().need_qualified ? "problem_summary" : undefined,
          mem.get().need_qualified ? { problemType: mem.get().problem_type, urgency: mem.get().urgency, summary: text } : undefined,
        );
        if (mem.get().address_known) {
          setTimeout(() => {
            const contractor = MOCK_CONTRACTORS[0];
            mem.update({ recommended_contractor_id: contractor.id, recommended_contractor_name: contractor.name });
            audioEngine.play("success");
            emitSafe("alex", `Je vous propose ${contractor.name}.`, "entrepreneur", contractor);
          }, 1200);
        } else {
          mem.set("last_question_asked", "city");
        }
      } else {
        // Show diagnosis response
        if (problem) {
          audioEngine.play("success");
          emitSafe("alex", `Ah je vois. ${problem.type === "barrage_glace" ? "Barrage de glace + perte de chaleur. Probable manque d'isolation dans l'entretoit." : `Problème de ${problem.type} détecté.`}`,
            "problem_summary",
            { problemType: problem.type, urgency: problem.urgency, summary: text, confidence: 0.92 },
          );
          // If we have service + location → auto-advance
          if (mem.get().service_category && mem.get().address_known) {
            setTimeout(() => {
              const contractor = MOCK_CONTRACTORS[0];
              mem.update({ recommended_contractor_id: contractor.id, recommended_contractor_name: contractor.name });
              audioEngine.play("success");
              emitSafe("alex", `Je vous propose ${contractor.name}.`, "entrepreneur", contractor);
            }, 1500);
          } else if (!mem.get().address_known) {
            mem.set("last_question_asked", "city");
          }
        } else {
          emitSafe("alex", "Pourriez-vous me donner plus de détails sur votre problème ?");
          mem.set("last_question_asked", "problem_details");
        }
      }
      setIsThinking(false);
      return;
    }

    // ─── PHOTO UPLOAD REQUEST ───
    if (intent === "homeowner_upload_photo_analysis") {
      emitSafe("alex", "Pourriez-vous téléverser une photo pour que je l'analyse?");
      setIsThinking(false);
      return;
    }

    // ─── FIND CONTRACTOR ───
    if (intent === "homeowner_find_contractor") {
      if (!mem.get().need_qualified || !mem.get().service_category) {
        emitSafe("alex", route.message);
        mem.set("last_question_asked", "service_type");
      } else if (!mem.get().address_known) {
        emitSafe("alex", "Dans quelle ville se situe votre propriété ?");
        mem.set("last_question_asked", "city");
      } else {
        const contractor = MOCK_CONTRACTORS[0];
        mem.update({ recommended_contractor_id: contractor.id, recommended_contractor_name: contractor.name });
        audioEngine.play("success");
        emitSafe("alex", `Je vous propose ${contractor.name}.`, "entrepreneur", contractor);
      }
      setIsThinking(false);
      return;
    }

    // ─── BOOK APPOINTMENT ───
    if (intent === "homeowner_book_appointment") {
      if (!mem.get().recommended_contractor_id) {
        emitSafe("alex", "D'abord, trouvons le bon professionnel. Quel type de travaux recherchez-vous ?");
        mem.set("last_question_asked", "service_type");
      } else {
        emitSafe("alex", "Voici les créneaux disponibles.", "booking_scheduler" as InlineCardType, {
          contractorId: mem.get().recommended_contractor_id,
          contractorName: mem.get().recommended_contractor_name,
          slots: MOCK_SLOTS,
          appointmentType: "évaluation",
        });
        mem.set("last_question_asked", "booking_slot");
      }
      setIsThinking(false);
      return;
    }

    // ─── COMPARE QUOTES ───
    if (intent === "homeowner_compare_quotes") {
      emitSafe("alex", "Je vais vous guider vers l'analyse comparative de vos soumissions.", "quote_analysis", MOCK_QUOTE_ANALYSIS);
      setIsThinking(false);
      return;
    }

    // ─── PROFILE / ADDRESS ───
    if (intent === "homeowner_complete_profile") {
      emitSafe("alex", "Je peux compléter votre profil ici.", "inline_form", {
        formKey: "profile", title: "Compléter votre profil",
        fields: [
          { key: "firstName", label: "Prénom", type: "text", placeholder: "Votre prénom", required: true },
          { key: "phone", label: "Téléphone", type: "phone", placeholder: "(514) 000-0000" },
          { key: "email", label: "Courriel", type: "email", placeholder: "vous@example.com" },
        ],
        submitLabel: "Enregistrer",
      });
      setIsThinking(false);
      return;
    }

    if (intent === "homeowner_add_address") {
      emitSafe("alex", "C'est bien pour cette adresse ?", "address_confirmation", {
        address: "1234 rue Principale", city: mem.get().city || "Laval", postalCode: "H7N 1A1",
      });
      setIsThinking(false);
      return;
    }

    // ─── AMBIGUOUS / CLARIFICATION ───
    if (intent === "ambiguous_need" || intent === "needs_clarification") {
      // Use next best action from memory
      const nextAction = computeNextBestAction(mem.get(), classification.primary_intent as AlexIntent);
      emitSafe("alex", nextAction.message);
      mem.set("last_question_asked", nextAction.action_key);
      setIsThinking(false);
      return;
    }

    // ─── FALLBACK: compute next best action ───
    const nextAction = computeNextBestAction(mem.get(), classification.primary_intent as AlexIntent);
    emitSafe("alex", nextAction.message);
    mem.set("last_question_asked", nextAction.action_key);
    setIsThinking(false);
  }, [emitSafe, userName]);

  // ─── FILE UPLOAD ───
  const handleFileUpload = useCallback(async (file: File, type: "photo" | "quote") => {
    const label = type === "photo" ? "📷 Photo uploadée" : "📄 Soumission envoyée";
    emitSafe("user", `${label}: ${file.name}`);
    setIsThinking(true);
    audioEngine.play("thinking");

    const mem = memoryRef.current;
    mem.set(type === "photo" ? "has_photo" : "has_quote", true);
    mem.set("need_qualified", true);

    await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));
    audioEngine.play("success");

    if (type === "photo") {
      // Detect problem from photo (mock)
      emitSafe("alex",
        "Ah je vois. Barrage de glace + perte de chaleur. Probable manque d'isolation dans l'entretoit.",
        "photo_problem",
        { ...MOCK_PHOTO_PROBLEM, confidence: 0.92 },
      );
      mem.update({
        problem_type: "barrage_glace",
        service_category: "Couvreur / Isolation",
        urgency: "high",
      });

      // Auto-advance to contractor if we have location
      if (mem.get().address_known) {
        setTimeout(() => {
          const contractor = MOCK_CONTRACTORS[0];
          mem.update({ recommended_contractor_id: contractor.id, recommended_contractor_name: contractor.name });
          audioEngine.play("success");
          emitSafe("alex", `Je vous propose ${contractor.name}.`, "entrepreneur", contractor);
        }, 1500);
      }
    } else {
      emitSafe("alex", "Analyse de soumission terminée. Voici le verdict.", "quote_analysis", MOCK_QUOTE_ANALYSIS);
    }
    setIsThinking(false);
  }, [emitSafe]);

  // ─── AUTH STATE UPDATE ───
  const updateAuthState = useCallback((authenticated: boolean, name?: string) => {
    const mem = memoryRef.current;
    if (authenticated) {
      mem.update({
        resolved_role: mem.get().resolved_role === "unknown" ? "homeowner" : mem.get().resolved_role,
        role_confidence: Math.max(mem.get().role_confidence, 0.6),
      });
    }
    if (authenticated && name) {
      emitSafe("alex", `Content de vous retrouver, ${name}. ${
        mem.get().need_qualified
          ? "On continue avec votre demande."
          : "Comment puis-je vous aider ?"
      }`);
    }
  }, [emitSafe]);

  // ─── EXPOSED STATE ───
  const mem = memoryRef.current.get();
  const currentPhase = mem.need_qualified
    ? (mem.recommended_contractor_id ? "show_result" : (mem.address_known ? "run_match" : "request_address"))
    : "assess_problem";

  return {
    messages,
    isThinking,
    sendMessage,
    initialize,
    handleFileUpload,
    flowState: {
      phase: currentPhase,
      problem: {
        problemType: mem.problem_type,
        projectType: mem.service_category,
        urgencyLevel: mem.urgency || "unknown",
        hasPhoto: mem.has_photo,
        hasQuote: mem.has_quote,
        summary: mem.need_summary,
        assessmentComplete: mem.need_qualified,
        questionsAsked: mem.questions_asked_count,
      },
      userContext: {
        isAuthenticated,
        userId: null,
        firstName: userName || null,
        email: null,
        hasAddress: mem.address_known,
        city: mem.city,
        profileComplete: isAuthenticated && !!userName,
        missingFields: [],
      },
      matchAttempted: !!mem.recommended_contractor_id,
      matchFound: !!mem.recommended_contractor_id,
      resumedAfterAuth: false,
      phaseBeforeAuth: null,
    },
    currentPhase,
    updateAuthState,
    // V5: Exposed brain state for debug panel
    brainState: {
      memory: mem,
      lastIntent: mem.current_intent,
      intentConfidence: mem.intent_confidence,
      currentRoute: mem.current_route,
    },
    // V6: Intelligence core state
    lastStructuredAnswer,
    lastPhotoPrompt,
    sessionId: sessionIdRef.current,
  };
}
