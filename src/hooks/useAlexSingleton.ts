/**
 * useAlexSingleton — Hook to interact with the AlexRuntimeSingleton.
 * Provides reactive state and lock management.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { alexRuntime, type AlexMountRole, type AlexRuntimeState } from '@/services/alexRuntimeSingleton';

export function useAlexSingleton(componentName: string, requestedRole: AlexMountRole = 'primary') {
  const [state, setState] = useState<AlexRuntimeState>(alexRuntime.getState());
  const assignedRoleRef = useRef<AlexMountRole>('passive');
  const mountedRef = useRef(false);

  // Register on mount, unregister on unmount — StrictMode safe
  useEffect(() => {
    if (mountedRef.current) return; // Guard against double mount
    mountedRef.current = true;
    
    assignedRoleRef.current = alexRuntime.registerSource(componentName, requestedRole);

    const unsub = alexRuntime.subscribe(setState);

    return () => {
      mountedRef.current = false;
      alexRuntime.unregisterSource(componentName);
      unsub();
    };
  }, [componentName, requestedRole]);

  const isPrimary = assignedRoleRef.current === 'primary';

  const acquireLock = useCallback(() => {
    if (!isPrimary) return false;
    return alexRuntime.acquireLock(componentName);
  }, [componentName, isPrimary]);

  const releaseLock = useCallback(() => {
    alexRuntime.releaseLock(componentName);
  }, [componentName]);

  const markActive = useCallback((voiceId?: string) => {
    alexRuntime.markActive(componentName, voiceId);
  }, [componentName]);

  const canStartVoice = alexRuntime.canStartVoice(componentName);

  return {
    state,
    isPrimary,
    assignedRole: assignedRoleRef.current,
    canStartVoice,
    acquireLock,
    releaseLock,
    markActive,
    isLocked: state.sessionStatus === 'active' || state.sessionStatus === 'booting',
    lockOwner: alexRuntime.getLockOwner(),
    events: state.events,
  };
}
