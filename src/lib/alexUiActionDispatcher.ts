/**
 * Alex UI Action Dispatcher
 *
 * Safely applies UI actions returned by the Alex brain layer.
 * Supports: navigate, highlight, draw_circle, show_score,
 * open_upload, show_plan_recommendation, scroll_to, open_booking, show_pricing, show_chips.
 */

export type AlexUIActionType =
  | "navigate"
  | "highlight"
  | "draw_circle"
  | "show_score"
  | "open_upload"
  | "show_plan_recommendation"
  | "show_pricing"
  | "scroll_to"
  | "open_booking"
  | "show_chips"
  | "show_trust"
  | "show_prediction";

export interface AlexUIAction {
  type: AlexUIActionType | string;
  target?: string;
  items?: string;
  [key: string]: string | undefined;
}

export interface DispatcherDeps {
  navigate: (path: string) => void;
  /** Overlay callbacks */
  onHighlight?: (selector: string) => void;
  onDrawCircle?: (selector: string) => void;
  onShowChips?: (items: string[]) => void;
  /** Panel toggles */
  onOpenUpload?: () => void;
  onOpenBooking?: () => void;
  onShowScore?: () => void;
  onShowPlanRecommendation?: (plan?: string) => void;
}

// CSS class applied to highlighted / circled elements
const HIGHLIGHT_CLASS = "alex-highlight";
const CIRCLE_CLASS = "alex-circle";

let highlightTimer: ReturnType<typeof setTimeout> | null = null;
let circleTimer: ReturnType<typeof setTimeout> | null = null;

function clearHighlights() {
  document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach((el) => el.classList.remove(HIGHLIGHT_CLASS));
  if (highlightTimer) {
    clearTimeout(highlightTimer);
    highlightTimer = null;
  }
}

function clearCircles() {
  document.querySelectorAll(`.${CIRCLE_CLASS}`).forEach((el) => el.classList.remove(CIRCLE_CLASS));
  if (circleTimer) {
    clearTimeout(circleTimer);
    circleTimer = null;
  }
}

function applyOverlay(selector: string, className: string, duration = 4000) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.classList.add(className);
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  const timer = setTimeout(() => el.classList.remove(className), duration);
  if (className === HIGHLIGHT_CLASS) {
    highlightTimer = timer;
  } else {
    circleTimer = timer;
  }
}

/**
 * Dispatch a single UI action from Alex.
 */
export function dispatchAlexAction(action: AlexUIAction, deps: DispatcherDeps) {
  if (!action?.type) return;

  switch (action.type) {
    // ── Navigation ──
    case "navigate":
      if (action.target) deps.navigate(action.target);
      break;

    // ── Visual overlays ──
    case "highlight":
      clearHighlights();
      if (action.target) {
        if (deps.onHighlight) {
          deps.onHighlight(action.target);
        } else {
          applyOverlay(action.target, HIGHLIGHT_CLASS);
        }
      }
      break;

    case "draw_circle":
      clearCircles();
      if (action.target) {
        if (deps.onDrawCircle) {
          deps.onDrawCircle(action.target);
        } else {
          applyOverlay(action.target, CIRCLE_CLASS);
        }
      }
      break;

    // ── Score ──
    case "show_score":
      if (deps.onShowScore) {
        deps.onShowScore();
      } else {
        deps.navigate("/dashboard/home-score");
      }
      break;

    // ── Upload ──
    case "open_upload":
      if (deps.onOpenUpload) {
        deps.onOpenUpload();
      } else {
        deps.navigate("/dashboard/quotes/upload");
      }
      break;

    // ── Plan recommendation ──
    case "show_plan_recommendation":
    case "show_pricing":
      if (deps.onShowPlanRecommendation) {
        deps.onShowPlanRecommendation(action.target);
      } else {
        const planParam = action.target ? `?plan=${action.target}` : "";
        deps.navigate(`/pricing${planParam}`);
      }
      break;

    // ── Booking ──
    case "open_booking":
      if (deps.onOpenBooking) {
        deps.onOpenBooking();
      } else {
        deps.navigate("/dashboard/booking");
      }
      break;

    // ── Scroll ──
    case "scroll_to":
      if (action.target) {
        const el =
          document.getElementById(action.target) ||
          document.querySelector(`[data-section="${action.target}"]`);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      break;

    // ── Chips ──
    case "show_chips":
      if (action.items && deps.onShowChips) {
        deps.onShowChips(action.items.split(",").map((s) => s.trim()));
      }
      break;

    // ── Trust / Prediction ──
    case "show_trust":
      deps.navigate(action.target || "/dashboard/trust");
      break;

    case "show_prediction":
      deps.navigate(action.target || "/dashboard/predictions");
      break;

    default:
      console.warn("[AlexDispatcher] Unknown action type:", action.type);
  }
}

/**
 * Dispatch a batch of UI actions sequentially.
 */
export function dispatchAlexActions(actions: AlexUIAction[], deps: DispatcherDeps) {
  for (const action of actions) {
    dispatchAlexAction(action, deps);
  }
}

/**
 * Cleanup all visual overlays.
 */
export function cleanupAlexOverlays() {
  clearHighlights();
  clearCircles();
}
