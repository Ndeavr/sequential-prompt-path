/**
 * alexMasterRouter — Single source of truth for Alex routing.
 *
 * Every chat message MUST go through `routeAlexIntent`. No page, modal, form
 * or component is allowed to bypass it. Routes are evaluated in strict
 * priority order; the first matching route wins. Blocked routes are recorded
 * for the debug HUD so behaviour is fully deterministic and inspectable.
 *
 * Priority (high → low):
 *   1. contractor_onboarding   (sticky once entered + entrepreneur signals)
 *   2. homeowner_project       (paint / humidity / roof / generic homeowner)
 *   3. quote_analysis          (soumission / comparer / devis)
 *   4. contractor_verification (vérifier / RBQ check)
 *   5. support                 (fallback — answer + chips)
 *
 * If contractor_onboarding wins, contact-form and callback flows are
 * forcibly disabled via `routerLockState`.
 */

import {
  decideNext,
  decideContractorNext,
  extractContractorIdentity,
  type AlexSession,
  type EngineDecision,
  type ContractorStage,
} from "./alexCopilotEngine";

// ─── Types ────────────────────────────────────────────────────────────

export type AlexRoute =
  | "contractor_onboarding"
  | "homeowner_project"
  | "quote_analysis"
  | "contractor_verification"
  | "support";

export type AlexRoleHint = "homeowner" | "contractor" | "condo_manager" | "admin" | "guest";

export interface RouterUserContext {
  userId?: string;
  role?: AlexRoleHint;
  isLoggedIn: boolean;
}

export interface RouterContext {
  /** Page / surface that hosts the chat (homepage, /entrepreneur, etc.) */
  surface?: string;
  /** Optional explicit role hint forced by the host page */
  forcedRole?: AlexRoleHint;
}

export interface RouteEvaluation {
  route: AlexRoute;
  matched: boolean;
  confidence: number;
  reason: string;
}

export interface RouterTrace {
  message: string;
  winningRoute: AlexRoute;
  confidence: number;
  blockedRoutes: RouteEvaluation[];
  evaluations: RouteEvaluation[];
  stage: ContractorStage | "homeowner" | "quote" | "verify" | "support";
  contactFormBlocked: boolean;
  callbackBlocked: boolean;
  timestamp: number;
}

export interface RouterResult {
  decision: EngineDecision;
  trace: RouterTrace;
  sessionPatch: Partial<AlexSession>;
}

// ─── Detection patterns (mirrors engine but kept independent for priority) ─

const CONTRACTOR_PATTERNS = [
  /\bje\s+suis\s+(un\s+)?(entrepreneur|contracteur|pro)\b/i,
  /\boffrir\s+mes\s+services\b/i,
  /\b(recevoir|avoir)\s+(plus\s+de\s+)?(clients|contrats|rendez-?vous)\b/i,
  /\bm['’]inscrire\s+comme\s+pro\b/i,
  /\b(rejoindre|faire\s+partie\s+(de|d'))\s*unpro\b/i,
  /\bplan\s+(entrepreneur|pro|premium|signature|élite|elite)\b/i,
  /\b(tarifs?|combien)\s+.*(pros?|entrepreneurs?|plans?)\b/i,
  /\bscore\s+aipp\b/i,
  /\bfiche\s+(entrepreneur|pro)\b/i,
  /\b(mon\s+entreprise|ma\s+compagnie)\b/i,
];

const QUOTE_PATTERNS = [
  /\b(soumission|devis)\b/i,
  /\bcomparer\s+(des|les|mes)\s+(soumissions?|devis|prix)\b/i,
  /\banalyser?\s+(une|ma)\s+soumission\b/i,
];

const VERIFY_PATTERNS = [
  /\bv[ée]rifier?\s+(un|cet?|mon)\s+(entrepreneur|contracteur|pro)\b/i,
  /\b(licence|license)\s+rbq\b/i,
  /\brbq\s+valide\b/i,
];

const HOMEOWNER_PATTERNS = [
  /\bpeintur|repeindre|peindre\b/i,
  /\bhumidit|moisi|moisissure|infiltrat\b/i,
  /\btoit|toiture|bardeau\b/i,
  /\b(trop\s+(froid|chaud)|fenêtre|porte|sous-?sol|fissure)\b/i,
  /\b(ma\s+maison|mon\s+condo|mon\s+logement|mon\s+appartement)\b/i,
];

// ─── Evaluators ───────────────────────────────────────────────────────

function evalContractor(
  message: string,
  session: AlexSession,
  user: RouterUserContext,
  ctx: RouterContext,
): RouteEvaluation {
  // Sticky: once contractor mode is entered, stay there until explicit reset.
  if (session.mode === "contractor_onboarding") {
    return { route: "contractor_onboarding", matched: true, confidence: 1, reason: "sticky_mode" };
  }
  if (ctx.forcedRole === "contractor" || user.role === "contractor") {
    return { route: "contractor_onboarding", matched: true, confidence: 0.95, reason: "role_hint" };
  }
  const hits = CONTRACTOR_PATTERNS.filter((p) => p.test(message));
  if (hits.length > 0) {
    return {
      route: "contractor_onboarding",
      matched: true,
      confidence: Math.min(1, 0.7 + 0.1 * hits.length),
      reason: `keyword:${hits.length}`,
    };
  }
  // Identity fragments alone are a strong signal (RBQ / NEQ / website without homeowner words)
  const id = extractContractorIdentity(message);
  if ((id.rbq || id.neq) && !HOMEOWNER_PATTERNS.some((p) => p.test(message))) {
    return { route: "contractor_onboarding", matched: true, confidence: 0.8, reason: "identity_fragment" };
  }
  return { route: "contractor_onboarding", matched: false, confidence: 0, reason: "no_signal" };
}

function evalQuote(message: string): RouteEvaluation {
  const hits = QUOTE_PATTERNS.filter((p) => p.test(message));
  return hits.length > 0
    ? { route: "quote_analysis", matched: true, confidence: 0.7 + 0.1 * hits.length, reason: `keyword:${hits.length}` }
    : { route: "quote_analysis", matched: false, confidence: 0, reason: "no_signal" };
}

function evalVerify(message: string): RouteEvaluation {
  const hits = VERIFY_PATTERNS.filter((p) => p.test(message));
  return hits.length > 0
    ? { route: "contractor_verification", matched: true, confidence: 0.75, reason: `keyword:${hits.length}` }
    : { route: "contractor_verification", matched: false, confidence: 0, reason: "no_signal" };
}

function evalHomeowner(message: string, session: AlexSession): RouteEvaluation {
  if (session.intent !== "unknown" && session.intent !== "contractor") {
    return { route: "homeowner_project", matched: true, confidence: 0.85, reason: `sticky_intent:${session.intent}` };
  }
  const hits = HOMEOWNER_PATTERNS.filter((p) => p.test(message));
  if (hits.length > 0) {
    return { route: "homeowner_project", matched: true, confidence: 0.7 + 0.1 * hits.length, reason: `keyword:${hits.length}` };
  }
  return { route: "homeowner_project", matched: false, confidence: 0, reason: "no_signal" };
}

// ─── Lock state (singleton) ───────────────────────────────────────────

interface LockState {
  contactFormBlocked: boolean;
  callbackBlocked: boolean;
  source: AlexRoute | null;
}

const lockState: LockState = {
  contactFormBlocked: false,
  callbackBlocked: false,
  source: null,
};

export function getRouterLockState(): Readonly<LockState> {
  return lockState;
}

export function isContactFormBlocked(): boolean {
  return lockState.contactFormBlocked;
}

export function isCallbackBlocked(): boolean {
  return lockState.callbackBlocked;
}

function applyLocks(route: AlexRoute) {
  if (route === "contractor_onboarding") {
    lockState.contactFormBlocked = true;
    lockState.callbackBlocked = true;
    lockState.source = route;
  } else {
    lockState.contactFormBlocked = false;
    lockState.callbackBlocked = false;
    lockState.source = null;
  }
}

// ─── Trace persistence (in-memory ring buffer + sessionStorage stage) ─

const TRACE_BUFFER: RouterTrace[] = [];
const MAX_TRACES = 50;
const STAGE_KEY = "alex.router.stage";

function persistStage(stage: RouterTrace["stage"]) {
  try {
    sessionStorage.setItem(STAGE_KEY, JSON.stringify({ stage, at: Date.now() }));
  } catch {
    /* ignore */
  }
}

export function readPersistedStage(): { stage: RouterTrace["stage"]; at: number } | null {
  try {
    const raw = sessionStorage.getItem(STAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getRouterTraces(): readonly RouterTrace[] {
  return TRACE_BUFFER;
}

export function getLastRouterTrace(): RouterTrace | null {
  return TRACE_BUFFER[TRACE_BUFFER.length - 1] ?? null;
}

function pushTrace(t: RouterTrace) {
  TRACE_BUFFER.push(t);
  if (TRACE_BUFFER.length > MAX_TRACES) TRACE_BUFFER.shift();
  // Notify any subscribers (HUD)
  try {
    window.dispatchEvent(new CustomEvent("alex:router:trace", { detail: t }));
  } catch {
    /* ignore */
  }
}

// ─── Public API ───────────────────────────────────────────────────────

const PRIORITY: AlexRoute[] = [
  "contractor_onboarding",
  "homeowner_project",
  "quote_analysis",
  "contractor_verification",
  "support",
];

export function routeAlexIntent(
  message: string,
  user: RouterUserContext,
  context: RouterContext,
  session: AlexSession,
): RouterResult {
  const evaluations: RouteEvaluation[] = [
    evalContractor(message, session, user, context),
    evalHomeowner(message, session),
    evalQuote(message),
    evalVerify(message),
    { route: "support", matched: true, confidence: 0.1, reason: "fallback" },
  ];

  // Sort by priority then matched
  const ordered = PRIORITY.map((r) => evaluations.find((e) => e.route === r)!).filter(Boolean);
  const winner = ordered.find((e) => e.matched) ?? ordered[ordered.length - 1];
  const blockedRoutes = ordered.filter((e) => e !== winner && e.matched);

  applyLocks(winner.route);

  // Dispatch to the appropriate engine
  let decision: EngineDecision;
  let stage: RouterTrace["stage"];

  switch (winner.route) {
    case "contractor_onboarding": {
      const contractorSession: AlexSession =
        session.mode === "contractor_onboarding"
          ? session
          : { ...session, mode: "contractor_onboarding", intent: "contractor", contractorStage: "intent_detected" };
      decision = decideContractorNext(contractorSession, message);
      stage = (decision.sessionPatch.contractorStage as ContractorStage) ?? contractorSession.contractorStage ?? "intent_detected";
      break;
    }
    case "quote_analysis":
      decision = decideNext({ ...session, intent: "quote_compare" }, message);
      stage = "quote";
      break;
    case "contractor_verification":
      decision = decideNext({ ...session, intent: "verify" }, message);
      stage = "verify";
      break;
    case "homeowner_project":
      decision = decideNext(session, message);
      stage = "homeowner";
      break;
    case "support":
    default:
      decision = decideNext(session, message);
      stage = "support";
      break;
  }

  const trace: RouterTrace = {
    message: message.slice(0, 200),
    winningRoute: winner.route,
    confidence: winner.confidence,
    blockedRoutes,
    evaluations: ordered,
    stage,
    contactFormBlocked: lockState.contactFormBlocked,
    callbackBlocked: lockState.callbackBlocked,
    timestamp: Date.now(),
  };

  pushTrace(trace);
  persistStage(stage);

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug("[AlexRouter]", {
      route: winner.route,
      conf: winner.confidence.toFixed(2),
      reason: winner.reason,
      blocked: blockedRoutes.map((b) => b.route),
      stage,
    });
  }

  return { decision, trace, sessionPatch: decision.sessionPatch };
}

/** Reset router locks + stage — used by store.reset(). */
export function resetRouter() {
  lockState.contactFormBlocked = false;
  lockState.callbackBlocked = false;
  lockState.source = null;
  TRACE_BUFFER.length = 0;
  try {
    sessionStorage.removeItem(STAGE_KEY);
  } catch {
    /* ignore */
  }
}
