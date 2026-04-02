/**
 * UNPRO — Auth Overlay global state
 * Lightweight store for triggering the auth overlay from anywhere.
 */

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

export function openAuthOverlay(pending?: PendingAction) {
  currentState = { isOpen: true, pendingAction: pending ?? null };
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
