/**
 * AlexRuntimeSingleton — Global singleton preventing dual Alex voice instances.
 * 
 * RULE: Only ONE Alex voice session can ever be active across the entire app.
 * Any component wanting to start voice MUST acquire the lock first.
 * If a lock is already held, the request is rejected and logged.
 */

import { alexAudioChannel } from "@/services/alexSingleAudioChannel";

export type AlexMountRole = 'primary' | 'passive' | 'disabled' | 'admin_preview';
export type AlexSessionStatus = 'idle' | 'booting' | 'active' | 'paused' | 'ended' | 'conflict' | 'failed';
export type AlexResultStatus = 'accepted' | 'ignored' | 'blocked' | 'cancelled' | 'completed' | 'failed';

export interface AlexRuntimeEvent {
  timestamp: number;
  componentName: string;
  mountRole: AlexMountRole;
  eventType: string;
  eventLabel?: string;
  resultStatus: AlexResultStatus;
  voiceId?: string;
  routePath?: string;
  conflictReason?: string;
}

export interface AlexRuntimeState {
  instanceId: string;
  sessionStatus: AlexSessionStatus;
  primaryComponentName: string | null;
  voiceId: string | null;
  mountedSources: Map<string, AlexMountRole>;
  autostartTriggered: boolean;
  autostartCompleted: boolean;
  duplicateAttempts: number;
  events: AlexRuntimeEvent[];
  pageKey: string;
}

type StateListener = (state: AlexRuntimeState) => void;

const WINDOW_LOCK_KEY = '__alex_runtime_lock__';
const SESSION_LOCK_KEY = 'alex_runtime_lock';
const MAX_EVENTS = 200;

class AlexRuntimeSingletonClass {
  private state: AlexRuntimeState;
  private listeners = new Set<StateListener>();
  private lockOwner: string | null = null;

  constructor() {
    this.state = this.createFreshState();
  }

  private createFreshState(): AlexRuntimeState {
    return {
      instanceId: crypto.randomUUID(),
      sessionStatus: 'idle',
      primaryComponentName: null,
      voiceId: null,
      mountedSources: new Map(),
      autostartTriggered: false,
      autostartCompleted: false,
      duplicateAttempts: 0,
      events: [],
      pageKey: 'home',
    };
  }

  getState(): AlexRuntimeState {
    return { ...this.state, mountedSources: new Map(this.state.mountedSources) };
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const snapshot = this.getState();
    this.listeners.forEach(l => { try { l(snapshot); } catch {} });
  }

  private logEvent(event: AlexRuntimeEvent) {
    this.state.events.push(event);
    if (this.state.events.length > MAX_EVENTS) {
      this.state.events = this.state.events.slice(-MAX_EVENTS);
    }
    console.log(`[AlexRuntime] ${event.eventType} | ${event.componentName} | ${event.resultStatus}`, event);
  }

  /**
   * Register a component as an Alex voice source.
   * Returns its assigned role.
   */
  registerSource(componentName: string, requestedRole: AlexMountRole = 'primary'): AlexMountRole {
    // If requesting primary and one already exists, demote to passive
    if (requestedRole === 'primary' && this.state.primaryComponentName && this.state.primaryComponentName !== componentName) {
      const event: AlexRuntimeEvent = {
        timestamp: Date.now(),
        componentName,
        mountRole: 'passive',
        eventType: 'mount',
        eventLabel: `Demoted to passive — primary already held by ${this.state.primaryComponentName}`,
        resultStatus: 'blocked',
        routePath: window.location.pathname,
      };
      this.logEvent(event);
      this.state.mountedSources.set(componentName, 'passive');
      this.state.duplicateAttempts++;
      this.notify();
      return 'passive';
    }

    if (requestedRole === 'primary') {
      this.state.primaryComponentName = componentName;
    }

    this.state.mountedSources.set(componentName, requestedRole);
    this.logEvent({
      timestamp: Date.now(),
      componentName,
      mountRole: requestedRole,
      eventType: 'mount',
      resultStatus: 'accepted',
      routePath: window.location.pathname,
    });
    this.notify();
    return requestedRole;
  }

  /**
   * Unregister a component.
   */
  unregisterSource(componentName: string) {
    this.state.mountedSources.delete(componentName);
    if (this.state.primaryComponentName === componentName) {
      this.state.primaryComponentName = null;
      this.releaseLock(componentName);
    }
    this.logEvent({
      timestamp: Date.now(),
      componentName,
      mountRole: 'primary',
      eventType: 'unmount',
      resultStatus: 'completed',
      routePath: window.location.pathname,
    });
    this.notify();
  }

  /**
   * Attempt to acquire the voice lock. Only the primary can start voice.
   */
  acquireLock(componentName: string): boolean {
    // Check window-level lock
    const windowLock = (window as any)[WINDOW_LOCK_KEY];
    if (windowLock && windowLock !== componentName) {
      this.logEvent({
        timestamp: Date.now(),
        componentName,
        mountRole: 'primary',
        eventType: 'lock_rejected',
        eventLabel: `Window lock held by ${windowLock}`,
        resultStatus: 'blocked',
        conflictReason: 'duplicate_mount',
        routePath: window.location.pathname,
      });
      this.state.duplicateAttempts++;
      this.notify();
      return false;
    }

    if (this.lockOwner && this.lockOwner !== componentName) {
      this.logEvent({
        timestamp: Date.now(),
        componentName,
        mountRole: 'primary',
        eventType: 'lock_rejected',
        eventLabel: `Lock held by ${this.lockOwner}`,
        resultStatus: 'blocked',
        conflictReason: 'duplicate_mount',
        routePath: window.location.pathname,
      });
      this.state.duplicateAttempts++;
      this.notify();
      return false;
    }

    // Acquire
    this.lockOwner = componentName;
    (window as any)[WINDOW_LOCK_KEY] = componentName;
    try { sessionStorage.setItem(SESSION_LOCK_KEY, componentName); } catch {}

    this.state.sessionStatus = 'booting';
    this.logEvent({
      timestamp: Date.now(),
      componentName,
      mountRole: 'primary',
      eventType: 'lock_acquired',
      resultStatus: 'accepted',
      routePath: window.location.pathname,
    });
    this.notify();
    return true;
  }

  /**
   * Release the voice lock.
   */
  releaseLock(componentName: string) {
    if (this.lockOwner !== componentName) return;
    this.lockOwner = null;
    (window as any)[WINDOW_LOCK_KEY] = null;
    try { sessionStorage.removeItem(SESSION_LOCK_KEY); } catch {}
    this.state.sessionStatus = 'ended';
    this.logEvent({
      timestamp: Date.now(),
      componentName,
      mountRole: 'primary',
      eventType: 'session_ended',
      resultStatus: 'completed',
      routePath: window.location.pathname,
    });
    this.notify();
  }

  /**
   * Mark session as active with a voice ID.
   */
  markActive(componentName: string, voiceId?: string) {
    if (this.lockOwner !== componentName) return;
    this.state.sessionStatus = 'active';
    if (voiceId) this.state.voiceId = voiceId;
    this.logEvent({
      timestamp: Date.now(),
      componentName,
      mountRole: 'primary',
      eventType: 'speech_started',
      resultStatus: 'accepted',
      voiceId,
      routePath: window.location.pathname,
    });
    this.notify();
  }

  /**
   * Check if voice can start from this component.
   */
  canStartVoice(componentName: string): boolean {
    const role = this.state.mountedSources.get(componentName);
    if (role !== 'primary') return false;
    if (this.lockOwner && this.lockOwner !== componentName) return false;
    return true;
  }

  /**
   * Mark autostart as triggered for this session.
   */
  markAutostartTriggered() {
    this.state.autostartTriggered = true;
    this.notify();
  }

  markAutostartCompleted() {
    this.state.autostartCompleted = true;
    this.notify();
  }

  /**
   * Hard reset — kill everything.
   */
  hardReset() {
    alexAudioChannel.hardStop();
    window.dispatchEvent(new CustomEvent('alex-voice-cleanup'));
    this.lockOwner = null;
    (window as any)[WINDOW_LOCK_KEY] = null;
    try { sessionStorage.removeItem(SESSION_LOCK_KEY); } catch {}
    const events = this.state.events;
    this.state = this.createFreshState();
    this.state.events = events;
    this.notify();
  }

  /**
   * Lightweight reset for restart — clears lock & session status without dispatching cleanup events.
   */
  clearForRestart() {
    this.lockOwner = null;
    (window as any)[WINDOW_LOCK_KEY] = null;
    try { sessionStorage.removeItem(SESSION_LOCK_KEY); } catch {}
    this.state.sessionStatus = 'idle';
    this.state.autostartTriggered = false;
    this.state.autostartCompleted = false;
    this.notify();
  }

  /**
   * Check if lock is currently held.
   */
  isLocked(): boolean {
    return this.lockOwner !== null;
  }

  getLockOwner(): string | null {
    return this.lockOwner;
  }

  getEvents(): AlexRuntimeEvent[] {
    return [...this.state.events];
  }
}

// SINGLETON
export const alexRuntime = new AlexRuntimeSingletonClass();
