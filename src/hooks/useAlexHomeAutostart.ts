/**
 * useAlexHomeAutostart — Controls Alex auto-start on home page only.
 * V5: Reduced delay to 600ms for instant feel.
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { alexRuntime } from '@/services/alexRuntimeSingleton';

const AUTOSTART_DELAY_MS = 600;

interface UseAlexHomeAutostartOptions {
  enabled: boolean;
  isPrimary: boolean;
  onAutostart: () => void;
}

export function useAlexHomeAutostart({ enabled, isPrimary, onAutostart }: UseAlexHomeAutostartOptions) {
  const location = useLocation();
  const firedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const isHome = location.pathname === '/' || location.pathname === '/index';
    if (!isHome || !enabled || !isPrimary || firedRef.current) return;

    if (document.hidden) return;

    timerRef.current = setTimeout(() => {
      if (firedRef.current) return;
      if (document.hidden) return;
      
      const state = alexRuntime.getState();
      if (state.autostartTriggered) return;
      if (alexRuntime.isLocked()) return;

      firedRef.current = true;
      alexRuntime.markAutostartTriggered();
      
      onAutostart();
      alexRuntime.markAutostartCompleted();
    }, AUTOSTART_DELAY_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [location.pathname, enabled, isPrimary, onAutostart]);
}
