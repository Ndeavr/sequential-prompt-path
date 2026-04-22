/**
 * Alex 100M — Session Restore Hook V7
 * - Never overrides activeLanguage (locked to fr-CA by bootstrap)
 * - Discards identity fields if auth user mismatch detected
 */

import { useEffect, useRef } from "react";
import { useAlexStore } from "../state/alexStore";
import { supabase } from "@/integrations/supabase/client";
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
      messages: s.messages.slice(-20),
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

    // V7: Verify auth user matches snapshot context
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUserId = session?.user?.id;
      // If there's an active user but snapshot seems from different context, discard identity
      if (currentUserId && snapshot.sessionId && !snapshot.sessionId.includes(currentUserId.slice(0, 8))) {
        alexLog("session:SESSION_IDENTITY_DISCARDED", {
          reason: "auth_user_mismatch",
          currentUserId: currentUserId.slice(0, 8),
        });
        useAlexStore.setState({
          isSessionRestored: true,
          identityMismatchDetected: true,
          // V7: Do NOT restore userRole or language — keep bootstrap values
          currentIntent: snapshot.currentIntent,
          interactionCount: snapshot.interactionCount,
        });
        return;
      }

      // Safe restore — but V7: NEVER override activeLanguage (locked to fr-CA by bootstrap)
      useAlexStore.setState({
        isSessionRestored: true,
        // activeLanguage intentionally NOT restored — bootstrap locks fr-CA
        userRole: snapshot.userRole,
        currentIntent: snapshot.currentIntent,
        interactionCount: snapshot.interactionCount,
      });

      alexLog("session:restored", {
        sessionId: snapshot.sessionId,
        msgCount: snapshot.messages.length,
      });
    }).catch(() => {
      // Auth check failed — restore non-identity fields only
      useAlexStore.setState({
        isSessionRestored: true,
        currentIntent: snapshot.currentIntent,
        interactionCount: snapshot.interactionCount,
      });
      alexLog("session:restored_no_auth_check");
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
