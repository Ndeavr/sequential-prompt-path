/**
 * Alex 100M — Welcome Manager
 * Prevents duplicate greeting injection and duplicate spoken greetings.
 */

import type { AlexLanguage, AlexUserRole } from "../types/alex.types";
import { getGreeting, getRestoredGreeting } from "../utils/alexCopy";
import { alexLog } from "../utils/alexDebug";

let greetingInjected = false;
let greetingSpoken = false;

export const alexWelcomeManager = {
  /** Get the greeting text without side effects */
  buildGreeting(
    lang: AlexLanguage,
    role?: AlexUserRole,
    isRestore?: boolean,
  ): string {
    if (isRestore) return getRestoredGreeting(lang);
    return getGreeting(lang, role);
  },

  /** Mark greeting as injected into chat. Returns false if already injected. */
  markGreetingInjected(): boolean {
    if (greetingInjected) {
      alexLog("welcome:already_injected");
      return false;
    }
    greetingInjected = true;
    alexLog("welcome:injected");
    return true;
  },

  /** Mark greeting as spoken via TTS. Returns false if already spoken. */
  markGreetingSpoken(): boolean {
    if (greetingSpoken) {
      alexLog("welcome:already_spoken");
      return false;
    }
    greetingSpoken = true;
    alexLog("welcome:spoken");
    return true;
  },

  isGreetingInjected(): boolean {
    return greetingInjected;
  },

  isGreetingSpoken(): boolean {
    return greetingSpoken;
  },

  /** Reset for a new session */
  reset(): void {
    greetingInjected = false;
    greetingSpoken = false;
    alexLog("welcome:reset");
  },
};
