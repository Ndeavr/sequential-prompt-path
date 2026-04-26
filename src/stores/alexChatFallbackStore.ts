/**
 * alexChatFallbackStore — opens a chat panel when Alex Voice fails.
 * Carries over the last transcripts as seed context.
 */
import { create } from "zustand";

export interface ChatSeedTurn {
  role: "user" | "alex";
  text: string;
}

interface State {
  isOpen: boolean;
  reason: string | null;
  seedTurns: ChatSeedTurn[];
  open: (reason: string, seedTurns?: ChatSeedTurn[]) => void;
  close: () => void;
}

export const useAlexChatFallbackStore = create<State>((set) => ({
  isOpen: false,
  reason: null,
  seedTurns: [],
  open: (reason, seedTurns = []) => set({ isOpen: true, reason, seedTurns }),
  close: () => set({ isOpen: false, reason: null, seedTurns: [] }),
}));
