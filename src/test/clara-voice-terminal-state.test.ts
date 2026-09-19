import { describe, it, expect, beforeEach } from "vitest";
import { useAlexVoiceLockedStore } from "@/stores/alexVoiceLockedStore";

/**
 * P0 — Cycle de vie vocal : une conversation terminée reste terminée.
 * Aucune relance automatique, aucun « Êtes-vous toujours là ? » en boucle.
 */
describe("Clara — état terminal de la session vocale", () => {
  beforeEach(() => {
    useAlexVoiceLockedStore.setState({
      machineState: "idle",
      isOverlayOpen: false,
      sessionId: null,
    });
  });

  it("passe en état terminal et y reste", () => {
    const s = useAlexVoiceLockedStore.getState();
    s.openVoiceSession("general", "test");
    useAlexVoiceLockedStore.setState({ machineState: "listening" });

    useAlexVoiceLockedStore.getState().completeVoiceSession("user_terminal_intent");
    expect(useAlexVoiceLockedStore.getState().machineState).toBe("completed");

    // Aucune transition automatique ne peut relancer l'écoute.
    const moved = useAlexVoiceLockedStore.getState().transitionTo("listening", "auto_relance");
    expect(moved).toBe(false);
    expect(useAlexVoiceLockedStore.getState().machineState).toBe("completed");
  });

  it("ne se relance que sur une action explicite de l'utilisateur", () => {
    const s = useAlexVoiceLockedStore.getState();
    s.openVoiceSession("general", "test");
    useAlexVoiceLockedStore.getState().completeVoiceSession("confirmed");

    useAlexVoiceLockedStore.getState().resumeVoiceSession("user_resume");
    expect(useAlexVoiceLockedStore.getState().machineState).toBe("requesting_permission");
  });

  it("completeVoiceSession est idempotent", () => {
    useAlexVoiceLockedStore.getState().openVoiceSession("general", "test");
    useAlexVoiceLockedStore.getState().completeVoiceSession("a");
    useAlexVoiceLockedStore.getState().completeVoiceSession("b");
    expect(useAlexVoiceLockedStore.getState().machineState).toBe("completed");
  });
});
