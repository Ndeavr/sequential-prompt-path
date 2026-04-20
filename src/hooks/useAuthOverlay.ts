/**
 * UNPRO — Auth Overlay global state
 * Lightweight store for triggering the auth overlay from anywhere.
 * Eagerly persists return-path intent so OAuth/magic-link redirects always
 * resume on the originating route, even after a fresh tab.
 */
import { saveAuthIntent } from "@/services/auth/authIntentService";

interface PendingAction {
  label: string;
  returnPath: string;
  action?: string;
}

let listeners: Array<() => void> = [];
let currentState = {
  isOpen: false as boolean,
  pendingAction: null as PendingAction | null,
};

function notify() {
  listeners.forEach((l) => l());
}

function currentRoute(): string {
  if (typeof window === "undefined") return "/";
  return window.location.pathname + window.location.search + window.location.hash;
}

export function openAuthOverlay(pending?: PendingAction) {
  // Default returnPath to the current route if none provided
  const resolved: PendingAction | null = pending
    ? { ...pending, returnPath: pending.returnPath || currentRoute() }
    : { label: "Accéder à votre espace", returnPath: currentRoute(), action: "open_overlay" };

  // Eagerly save intent so OAuth/magic-link survives across tabs
  if (resolved && resolved.returnPath && !/^\/(login|signup|auth\/callback|role|start)\b/.test(resolved.returnPath)) {
    saveAuthIntent({
      returnPath: resolved.returnPath,
      action: resolved.action,
    });
  }

  currentState = { isOpen: true, pendingAction: resolved };
  notify();
}

export function closeAuthOverlay() {
  currentState = { ...currentState, isOpen: false };
  notify();
}

export function getAuthOverlayState() {
  return currentState;
}

export function subscribeAuthOverlay(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export type { PendingAction };
