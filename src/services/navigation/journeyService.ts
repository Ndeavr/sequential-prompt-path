/**
 * UNPRO — Journey Continuity Service
 * Manages user journey state, snapshots, and context preservation across sessions.
 * Uses sessionStorage for immediate context and localStorage for persistent snapshots.
 */

const JOURNEY_KEY = "unpro_journey_state";
const SNAPSHOT_KEY = "unpro_journey_snapshot";
const NAV_CONTEXT_KEY = "unpro_nav_context";

// ─── Types ───

export interface JourneyState {
  activeJourney: string | null;
  currentPath: string;
  previousPath: string | null;
  lastSafePath: string;
  currentStepKey: string | null;
  selectedService: string | null;
  selectedPropertyId: string | null;
  selectedContractorId: string | null;
  selectedPlan: string | null;
  lastEntrySource: string | null;
  updatedAt: number;
}

export interface JourneySnapshot {
  activeJourney: string;
  routePath: string;
  stepKey: string | null;
  payload: Record<string, unknown>;
  createdAt: number;
}

export interface NavigationContext {
  currentPath: string;
  previousPath: string | null;
  intendedDestination: string;
  intendedRole: string | null;
  sourceCta: string | null;
  sourcePage: string | null;
  entryPageType: string | null;
  authRequired: boolean;
  timestamp: number;
}

// ─── Journey State ───

export function getJourneyState(): JourneyState | null {
  try {
    const raw = sessionStorage.getItem(JOURNEY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function updateJourneyState(patch: Partial<JourneyState>): JourneyState {
  const current = getJourneyState() || createDefaultJourneyState();
  const updated = { ...current, ...patch, updatedAt: Date.now() };
  try {
    sessionStorage.setItem(JOURNEY_KEY, JSON.stringify(updated));
  } catch {}
  return updated;
}

function createDefaultJourneyState(): JourneyState {
  return {
    activeJourney: null,
    currentPath: "/",
    previousPath: null,
    lastSafePath: "/",
    currentStepKey: null,
    selectedService: null,
    selectedPropertyId: null,
    selectedContractorId: null,
    selectedPlan: null,
    lastEntrySource: null,
    updatedAt: Date.now(),
  };
}

// ─── Journey Snapshots (persistent) ───

export function saveJourneySnapshot(snapshot: Omit<JourneySnapshot, "createdAt">): void {
  const data: JourneySnapshot = { ...snapshot, createdAt: Date.now() };
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(data));
  } catch {}
}

export function getLatestSnapshot(): JourneySnapshot | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const snapshot: JourneySnapshot = JSON.parse(raw);
    // Expire after 7 days
    if (Date.now() - snapshot.createdAt > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(SNAPSHOT_KEY);
      return null;
    }
    return snapshot;
  } catch { return null; }
}

export function clearSnapshot(): void {
  try { localStorage.removeItem(SNAPSHOT_KEY); } catch {}
}

// ─── Navigation Context (pre-transition capture) ───

export function saveNavigationContext(ctx: Omit<NavigationContext, "timestamp">): void {
  const data: NavigationContext = { ...ctx, timestamp: Date.now() };
  try {
    sessionStorage.setItem(NAV_CONTEXT_KEY, JSON.stringify(data));
  } catch {}
}

export function consumeNavigationContext(): NavigationContext | null {
  try {
    const raw = sessionStorage.getItem(NAV_CONTEXT_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(NAV_CONTEXT_KEY);
    const ctx: NavigationContext = JSON.parse(raw);
    // Expire after 30 min
    if (Date.now() - ctx.timestamp > 30 * 60 * 1000) return null;
    return ctx;
  } catch { return null; }
}

// ─── Path Tracking ───

export function trackNavigation(from: string, to: string, source?: string): void {
  const state = getJourneyState();
  updateJourneyState({
    previousPath: from,
    currentPath: to,
    lastSafePath: isProtectedPath(from) ? (state?.lastSafePath || "/") : from,
    lastEntrySource: source || state?.lastEntrySource || null,
  });
}

function isProtectedPath(path: string): boolean {
  return ["/login", "/signup", "/auth/callback", "/onboarding"].some(p => path.startsWith(p));
}

// ─── Resume Logic ───

export function getResumePath(role: string | null): string | null {
  // 1. Check snapshot
  const snapshot = getLatestSnapshot();
  if (snapshot) {
    const roleMatches = !role || snapshot.activeJourney === role || role === "admin";
    if (roleMatches) return snapshot.routePath;
  }

  // 2. Check journey state
  const state = getJourneyState();
  if (state?.currentPath && state.currentPath !== "/" && state.currentPath !== "/login") {
    return state.currentPath;
  }

  return null;
}

/**
 * Determine if user has an active journey they can resume
 */
export function hasResumableJourney(): boolean {
  const snapshot = getLatestSnapshot();
  const state = getJourneyState();
  return !!(
    (snapshot && snapshot.routePath !== "/") ||
    (state && state.currentPath !== "/" && state.currentPath !== "/login")
  );
}
