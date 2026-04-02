/**
 * UNPRO — Auth Overlay global state
 * Lightweight store for triggering the auth overlay from anywhere.
 */
import { create } from "zustand";

interface PendingAction {
  label: string;
  returnPath: string;
  action?: string;
}

interface AuthOverlayState {
  isOpen: boolean;
  pendingAction: PendingAction | null;
  open: (pending?: PendingAction) => void;
  close: () => void;
}

// We use a simple callback pattern instead of zustand to avoid adding a dep
let listeners: Array<() => void> = [];
let state: AuthOverlayState = {
  isOpen: false,
  pendingAction: null,
  open: () => {},
  close: () => {},
};

function notify() {
  listeners.forEach((l) => l());
}

export function openAuthOverlay(pending?: PendingAction) {
  state = { ...state, isOpen: true, pendingAction: pending ?? null };
  notify();
}

export function closeAuthOverlay() {
  state = { ...state, isOpen: false };
  notify();
}

export function getAuthOverlayState() {
  return state;
}

export function subscribeAuthOverlay(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export type { PendingAction };
