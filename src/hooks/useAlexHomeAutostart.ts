/**
 * useAlexHomeAutostart — Controls Alex auto-start on home page only.
 * 
 * Rules:
 * - Only triggers on home page (/)
 * - Waits for hydration + visibility + stable route
 * - Only fires ONCE per session visit
 * - Guards against StrictMode double-fire
 * - No restart on tab return if Alex already spoke
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { alexRuntime } from '@/services/alexRuntimeSingleton';

const AUTOSTART_SESSION_KEY = 'alex_home_autostart_done';
const AUTOSTART_DELAY_MS = 1500;

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
    // Only on home page
    const isHome = location.pathname === '/' || location.pathname === '/index';
    if (!isHome || !enabled || !isPrimary || firedRef.current) return;

    // Check if already autoplayed this session
    try {
      if (sessionStorage.getItem(AUTOSTART_SESSION_KEY)) return;
    } catch {}

    // Check visibility
    if (document.hidden) return;

    // Delay to let hydration settle
    timerRef.current = setTimeout(() => {
      if (firedRef.current) return;
      if (document.hidden) return;
      
      const state = alexRuntime.getState();
      if (state.autostartTriggered) return;
      if (alexRuntime.isLocked()) return;

      firedRef.current = true;
      alexRuntime.markAutostartTriggered();
      
      try { sessionStorage.setItem(AUTOSTART_SESSION_KEY, '1'); } catch {}
      
      onAutostart();
      alexRuntime.markAutostartCompleted();
    }, AUTOSTART_DELAY_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [location.pathname, enabled, isPrimary, onAutostart]);
}
