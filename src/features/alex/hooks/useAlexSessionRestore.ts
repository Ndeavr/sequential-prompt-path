/**
 * Alex 100M — Session Restore Hook
 * Restores minimal local session safely. No crash if data missing.
 */

import { useEffect, useRef } from "react";
import { useAlexStore } from "../state/alexStore";
import { alexLog } from "../utils/alexDebug";
import type { AlexSessionSnapshot } from "../types/alex.types";

const STORAGE_KEY = "alex_session";

function saveSnapshot(): void {
  try {
    const s = useAlexStore.getState();
    const snapshot: AlexSessionSnapshot = {
      sessionId: s.sessionId || "",
      language: s.activeLanguage,
      userRole: s.userRole,
      currentIntent: s.currentIntent,
      messages: s.messages.slice(-20), // Keep last 20 messages only
      interactionCount: s.interactionCount,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Storage full or unavailable — ignore
  }
}

function loadSnapshot(): AlexSessionSnapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as AlexSessionSnapshot;
    // Expire after 30 minutes
    if (Date.now() - data.timestamp > 30 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function useAlexSessionRestore() {
  const restored = useRef(false);

  // Restore on mount
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;

    const snapshot = loadSnapshot();
    if (!snapshot || !snapshot.sessionId) {
      alexLog("session:no_snapshot");
      return;
    }

    const state = useAlexStore.getState();
    if (state.isInitialized) return; // Already booted

    useAlexStore.setState({
      isSessionRestored: true,
      activeLanguage: snapshot.language,
      userRole: snapshot.userRole,
      currentIntent: snapshot.currentIntent,
      interactionCount: snapshot.interactionCount,
    });

    alexLog("session:restored", {
      sessionId: snapshot.sessionId,
      msgCount: snapshot.messages.length,
    });
  }, []);

  // Save on meaningful state changes
  useEffect(() => {
    const unsub = useAlexStore.subscribe((state, prevState) => {
      if (
        state.messages.length !== prevState.messages.length ||
        state.currentIntent !== prevState.currentIntent ||
        state.userRole !== prevState.userRole
      ) {
        saveSnapshot();
      }
    });
    return unsub;
  }, []);

  // Save before unload
  useEffect(() => {
    const handler = () => saveSnapshot();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);
}
