/**
 * Inline Alex actions (UI cards) rendered in chat.
 */
import { create } from "zustand";
import type { AlexAction } from "./types";

interface VisualState {
  actions: AlexAction[];
  pushAction: (a: AlexAction) => void;
  removeAction: (id: string) => void;
  clear: () => void;
}

export const useAlexVisualStore = create<VisualState>((set) => ({
  actions: [],
  pushAction: (a) => set((s) => ({ actions: [...s.actions.filter((x) => x.id !== a.id), a] })),
  removeAction: (id) => set((s) => ({ actions: s.actions.filter((x) => x.id !== id) })),
  clear: () => set({ actions: [] }),
}));
