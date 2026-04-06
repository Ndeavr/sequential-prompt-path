/**
 * AlexRuntimeSingleton — Global singleton guard for Alex voice runtime.
 * 
 * RULES:
 * 1. Only ONE Alex voice instance can be active at any time
 * 2. Every mount attempt is logged with component name + role
 * 3. Secondary mounts are forced passive (no audio, no autostart)
 * 4. Conflicts are tracked for admin debug
 */
import { createContext, useContext, useCallback, useRef, useState, useEffect, type ReactNode } from "react";
import { alexAudioChannel } from "@/services/alexSingleAudioChannel";

export type AlexMountRole = "primary" | "passive" | "disabled" | "admin_preview";

interface MountEntry {
  id: string;
  componentName: string;
  role: AlexMountRole;
  mountedAt: number;
  route: string;
}

interface ConflictEntry {
  id: string;
  type: string;
  primaryComponent: string;
  secondaryComponent: string;
  reason: string;
  timestamp: number;
  autoResolved: boolean;
}

interface RuntimeEvent {
  id: string;
  componentName: string;
  eventType: string;
  label: string;
  timestamp: number;
  resultStatus: "accepted" | "blocked" | "cancelled";
}

interface AlexRuntimeState {
  instanceId: string;
  sessionActive: boolean;
  voiceActive: boolean;
  primaryComponent: string | null;
  mountedSources: MountEntry[];
  conflicts: ConflictEntry[];
  events: RuntimeEvent[];
  autostartTriggered: boolean;
  autostartCompleted: boolean;
}

interface AlexRuntimeContextType {
  state: AlexRuntimeState;
  requestMount: (componentName: string, preferredRole?: AlexMountRole) => AlexMountRole;
  releaseMount: (componentName: string) => void;
  requestAutostart: (componentName: string) => boolean;
  markAutostartComplete: () => void;
  markVoiceActive: (active: boolean) => void;
  getEvents: () => RuntimeEvent[];
  getConflicts: () => ConflictEntry[];
}

const AlexRuntimeContext = createContext<AlexRuntimeContextType | null>(null);

// Window-level lock to survive React StrictMode double-mount
const WINDOW_LOCK_KEY = "__alex_runtime_lock__";

function getWindowLock(): { locked: boolean; by: string | null; instanceId: string | null } {
  return (window as any)[WINDOW_LOCK_KEY] || { locked: false, by: null, instanceId: null };
}

function setWindowLock(by: string | null, instanceId: string | null) {
  (window as any)[WINDOW_LOCK_KEY] = { locked: !!by, by, instanceId };
}

export function AlexRuntimeSingletonProvider({ children }: { children: ReactNode }) {
  const instanceId = useRef(crypto.randomUUID()).current;
  const [state, setState] = useState<AlexRuntimeState>({
    instanceId,
    sessionActive: false,
    voiceActive: false,
    primaryComponent: null,
    mountedSources: [],
    conflicts: [],
    events: [],
    autostartTriggered: false,
    autostartCompleted: false,
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const lock = getWindowLock();
      if (lock.instanceId === instanceId) {
        setWindowLock(null, null);
      }
    };
  }, [instanceId]);

  const addEvent = useCallback((componentName: string, eventType: string, label: string, resultStatus: "accepted" | "blocked" | "cancelled") => {
    const event: RuntimeEvent = {
      id: crypto.randomUUID(),
      componentName,
      eventType,
      label,
      timestamp: Date.now(),
      resultStatus,
    };
    setState(prev => ({ ...prev, events: [...prev.events.slice(-99), event] }));
    console.log(`[AlexRuntime] ${eventType} by ${componentName}: ${resultStatus} — ${label}`);
    return event;
  }, []);

  const addConflict = useCallback((type: string, primary: string, secondary: string, reason: string) => {
    const conflict: ConflictEntry = {
      id: crypto.randomUUID(),
      type,
      primaryComponent: primary,
      secondaryComponent: secondary,
      reason,
      timestamp: Date.now(),
      autoResolved: true,
    };
    setState(prev => ({ ...prev, conflicts: [...prev.conflicts.slice(-49), conflict] }));
    console.warn(`[AlexRuntime] CONFLICT: ${type} — ${primary} vs ${secondary}: ${reason}`);
    return conflict;
  }, []);

  const requestMount = useCallback((componentName: string, preferredRole: AlexMountRole = "primary"): AlexMountRole => {
    const lock = getWindowLock();
    const route = window.location.pathname;

    // If requesting primary and no lock exists → grant primary
    if (preferredRole === "primary" && !lock.locked) {
      setWindowLock(componentName, instanceId);
      const entry: MountEntry = { id: crypto.randomUUID(), componentName, role: "primary", mountedAt: Date.now(), route };
      setState(prev => ({
        ...prev,
        primaryComponent: componentName,
        mountedSources: [...prev.mountedSources, entry],
      }));
      addEvent(componentName, "mount", `Primary mount granted on ${route}`, "accepted");
      return "primary";
    }

    // If requesting primary but lock exists by different component → force passive
    if (preferredRole === "primary" && lock.locked && lock.by !== componentName) {
      addConflict("duplicate_mount", lock.by || "unknown", componentName, `${componentName} tried primary but ${lock.by} already holds lock`);
      addEvent(componentName, "mount", `Forced passive — ${lock.by} is primary`, "blocked");
      
      // Kill any audio this component might try to start
      alexAudioChannel.hardStop();
      
      const entry: MountEntry = { id: crypto.randomUUID(), componentName, role: "passive", mountedAt: Date.now(), route };
      setState(prev => ({ ...prev, mountedSources: [...prev.mountedSources, entry] }));
      return "passive";
    }

    // Same component re-mounting (StrictMode) → re-grant
    if (preferredRole === "primary" && lock.locked && lock.by === componentName) {
      addEvent(componentName, "mount", "Re-mount (StrictMode), lock preserved", "accepted");
      return "primary";
    }

    // Passive / disabled / admin_preview — just register
    const entry: MountEntry = { id: crypto.randomUUID(), componentName, role: preferredRole, mountedAt: Date.now(), route };
    setState(prev => ({ ...prev, mountedSources: [...prev.mountedSources, entry] }));
    addEvent(componentName, "mount", `Mounted as ${preferredRole}`, "accepted");
    return preferredRole;
  }, [instanceId, addEvent, addConflict]);

  const releaseMount = useCallback((componentName: string) => {
    const lock = getWindowLock();
    if (lock.by === componentName) {
      setWindowLock(null, null);
      setState(prev => ({
        ...prev,
        primaryComponent: null,
        mountedSources: prev.mountedSources.filter(m => m.componentName !== componentName),
      }));
      addEvent(componentName, "unmount", "Primary released", "accepted");
    } else {
      setState(prev => ({
        ...prev,
        mountedSources: prev.mountedSources.filter(m => m.componentName !== componentName),
      }));
      addEvent(componentName, "unmount", "Passive unmounted", "accepted");
    }
  }, [addEvent]);

  const requestAutostart = useCallback((componentName: string): boolean => {
    const lock = getWindowLock();
    
    // Only primary can autostart
    if (lock.by !== componentName) {
      addEvent(componentName, "autostart_requested", "Rejected — not primary", "blocked");
      addConflict("duplicate_autostart", lock.by || "none", componentName, "Non-primary tried to autostart");
      return false;
    }

    // Already triggered this session
    let alreadyTriggered = false;
    setState(prev => {
      alreadyTriggered = prev.autostartTriggered;
      return prev;
    });
    if (alreadyTriggered) {
      addEvent(componentName, "autostart_requested", "Rejected — already triggered", "blocked");
      return false;
    }

    setState(prev => ({ ...prev, autostartTriggered: true }));
    addEvent(componentName, "autostart_started", "Autostart granted", "accepted");
    return true;
  }, [addEvent, addConflict]);

  const markAutostartComplete = useCallback(() => {
    setState(prev => ({ ...prev, autostartCompleted: true }));
  }, []);

  const markVoiceActive = useCallback((active: boolean) => {
    setState(prev => ({ ...prev, voiceActive: active, sessionActive: active }));
  }, []);

  const getEvents = useCallback(() => state.events, [state.events]);
  const getConflicts = useCallback(() => state.conflicts, [state.conflicts]);

  return (
    <AlexRuntimeContext.Provider value={{
      state, requestMount, releaseMount, requestAutostart,
      markAutostartComplete, markVoiceActive, getEvents, getConflicts,
    }}>
      {children}
    </AlexRuntimeContext.Provider>
  );
}

export function useAlexRuntime() {
  const ctx = useContext(AlexRuntimeContext);
  if (!ctx) throw new Error("useAlexRuntime must be used within AlexRuntimeSingletonProvider");
  return ctx;
}

export function useAlexRuntimeOptional() {
  return useContext(AlexRuntimeContext);
}
