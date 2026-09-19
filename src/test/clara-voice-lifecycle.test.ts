import { describe, it, expect, beforeEach } from "vitest";
import { useAlexVoiceLockedStore } from "@/stores/alexVoiceLockedStore";

const store = () => useAlexVoiceLockedStore.getState();

function openAndReachListening() {
  store().openVoiceSession("test");
  store().transitionTo("requesting_permission", "test");
  store().transitionTo("opening_session", "test");
  store().transitionTo("session_ready", "test");
  store().transitionTo("listening", "test");
}

describe("Clara Voice — cycle de vie fini", () => {
  beforeEach(() => {
    store().closeVoiceSession("user_explicit_close");
  });

  it("passe en pause depuis l'écoute sans erreur", () => {
    openAndReachListening();
    store().pauseVoiceSession("inactivity:listening");
    expect(store().machineState).toBe("paused");
    expect(store().errorMessage).toBeNull();
  });

  it("la mise en pause est idempotente", () => {
    openAndReachListening();
    store().pauseVoiceSession("inactivity:listening");
    store().pauseVoiceSession("inactivity:listening");
    expect(store().machineState).toBe("paused");
  });

  it("reprend depuis la pause vers une nouvelle demande de micro", () => {
    openAndReachListening();
    store().pauseVoiceSession("inactivity:listening");
    store().resumeVoiceSession("user_resume");
    expect(store().machineState).toBe("requesting_permission");
    expect(store().isOverlayOpen).toBe(true);
  });

  it("la fermeture explicite depuis la pause termine la session", () => {
    openAndReachListening();
    store().pauseVoiceSession("inactivity:listening");
    store().closeVoiceSession("user_explicit_close");
    expect(store().isOverlayOpen).toBe(false);
    expect(store().machineState).toBe("idle");
  });

  it("ouvrir et fermer cinq fois laisse exactement un état propre", () => {
    for (let i = 0; i < 5; i++) {
      openAndReachListening();
      store().closeVoiceSession("user_explicit_close");
    }
    expect(store().machineState).toBe("idle");
    expect(store().isOverlayOpen).toBe(false);
  });
});
