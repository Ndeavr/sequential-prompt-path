import { useEffect, useRef, useState } from "react";
import { CONTRACTOR_HUMAN_CALLOUT, isContractorSurface } from "@/config/contractorHumanCallout";
import { logFunnelEvent } from "@/lib/analytics/logFunnelEvent";
import { HUMAN_HELP_SIGNAL_EVENT, type HumanHelpReason, type HumanHelpSignalDetail } from "@/lib/support/struggleSignals";
import { useAlexVoiceLockedStore } from "@/stores/alexVoiceLockedStore";

const INPUT_SELECTOR = 'input, textarea, select, [contenteditable="true"]';
const RECHECK_MS = 1000;
const EXCLUDED_PREFIXES = ["/checkout", "/calendar", "/oauth", "/pro/welcome", "/pro/profile", "/pro/onboarding", "/contractor/activated"];

function isUserTyping(): boolean {
  if (typeof document === "undefined") return false;
  const el = document.activeElement;
  if (el && el.matches?.(INPUT_SELECTOR)) return true;
  return false;
}

export function useContractorHumanCallout() {
  const [isOpen, setIsOpen] = useState(false);
  const [showClaraNudge, setShowClaraNudge] = useState(false);
  const [reason, setReason] = useState<HumanHelpReason | null>(null);
  const [pathKey, setPathKey] = useState(0);
  const routeChangedAt = useRef(Date.now());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onChange = () => { routeChangedAt.current = Date.now(); setPathKey((k) => k + 1); };
    window.addEventListener("popstate", onChange);
    const origPush = history.pushState;
    const origReplace = history.replaceState;
    history.pushState = function (...args) {
      const r = origPush.apply(this, args as any);
      onChange();
      return r;
    };
    history.replaceState = function (...args) {
      const r = origReplace.apply(this, args as any);
      onChange();
      return r;
    };
    return () => {
      window.removeEventListener("popstate", onChange);
      history.pushState = origPush;
      history.replaceState = origReplace;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(CONTRACTOR_HUMAN_CALLOUT.storageKey)) return;
    } catch {}

    const path = window.location.pathname;
    if (EXCLUDED_PREFIXES.some((p) => path === p || path.startsWith(p + "/") || path.startsWith(p))) return;
    // Never show the floating "Appeler" callout on personalized sniper landings (/pro/:slug).
    // These pages already carry their own dedicated CTAs and voice narration; the modal
    // creates visual noise and competes with the primary conversion path.
    const RESERVED_PRO_DASHBOARD = new Set([
      "welcome", "dashboard", "profile", "leads", "appointments", "reviews", "billing",
      "territories", "documents", "account", "aipp-score", "domain-intelligence", "onboarding",
    ]);
    const proLandingMatch = path.match(/^\/pro\/([^/]+)\/?$/);
    if (proLandingMatch && !RESERVED_PRO_DASHBOARD.has(proLandingMatch[1].toLowerCase())) return;
    if (!isContractorSurface(path, window.location.search)) return;

    const mountedAt = Date.now();
    let lastInputAt = 0;
    let lastProgressAt = Date.now();
    let interactionCount = 0;
    let validationErrors = 0;
    let lastTarget = "";
    let repeatedClicks = 0;
    let pendingSignal: HumanHelpSignalDetail | null = null;
    let timer: number | null = null;
    let cancelled = false;

    const onInput = () => {
      lastInputAt = Date.now();
      lastProgressAt = Date.now();
      interactionCount += 1;
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("button, a, [role='button']") : null;
      if (!target) return;
      interactionCount += 1;
      const key = `${target.tagName}:${target.textContent?.trim().slice(0, 80) ?? ""}`;
      repeatedClicks = key === lastTarget ? repeatedClicks + 1 : 1;
      lastTarget = key;
      if (repeatedClicks >= 3) pendingSignal = { reason: "repeated_click_without_progress" };
    };
    const onInvalid = () => {
      validationErrors += 1;
      if (validationErrors >= 2) pendingSignal = { reason: "repeated_validation_errors" };
    };
    const onSignal = (event: Event) => {
      pendingSignal = (event as CustomEvent<HumanHelpSignalDetail>).detail;
    };
    document.addEventListener("focusin", onInput, true);
    document.addEventListener("input", onInput, true);
    document.addEventListener("keydown", onInput, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("invalid", onInvalid, true);
    window.addEventListener(HUMAN_HELP_SIGNAL_EVENT, onSignal);

    const isSuppressed = () => {
      const currentPath = window.location.pathname;
      return isUserTyping()
        || useAlexVoiceLockedStore.getState().isOverlayOpen
        || EXCLUDED_PREFIXES.some((p) => currentPath === p || currentPath.startsWith(`${p}/`))
        || Date.now() - routeChangedAt.current < 5000
        || Boolean(document.querySelector('[aria-busy="true"], [data-loading="true"], .animate-spin'));
    };

    const emit = (event_type: "human_help_eligible" | "human_help_shown" | "human_help_trigger_reason") => {
      if (!pendingSignal) return;
      void logFunnelEvent({ event_type, metadata: { trigger_reason: pendingSignal.reason } });
    };

    const tryOpen = () => {
      if (cancelled) return;
      if (!pendingSignal && interactionCount > 0 && Date.now() - lastProgressAt >= CONTRACTOR_HUMAN_CALLOUT.minDwellMs) {
        pendingSignal = { reason: "important_step_abandoned" };
      }
      if (!pendingSignal || Date.now() - mountedAt < CONTRACTOR_HUMAN_CALLOUT.minDwellMs || isSuppressed()) {
        timer = window.setTimeout(tryOpen, RECHECK_MS);
        return;
      }
      setReason(pendingSignal.reason);
      emit("human_help_eligible");
      emit("human_help_trigger_reason");
      const nudgeShown = sessionStorage.getItem(CONTRACTOR_HUMAN_CALLOUT.nudgeStorageKey);
      if (!nudgeShown) {
        sessionStorage.setItem(CONTRACTOR_HUMAN_CALLOUT.nudgeStorageKey, "1");
        setShowClaraNudge(true);
        timer = window.setTimeout(() => {
          if (!cancelled && !isSuppressed()) {
            setShowClaraNudge(false);
            setIsOpen(true);
            emit("human_help_shown");
          }
        }, CONTRACTOR_HUMAN_CALLOUT.minDwellMs);
        return;
      }
      setIsOpen(true);
      emit("human_help_shown");
    };

    timer = window.setTimeout(tryOpen, RECHECK_MS);

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      document.removeEventListener("focusin", onInput, true);
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("keydown", onInput, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("invalid", onInvalid, true);
      window.removeEventListener(HUMAN_HELP_SIGNAL_EVENT, onSignal);
    };
  }, [pathKey]);

  const dismiss = () => {
    try {
      sessionStorage.setItem(CONTRACTOR_HUMAN_CALLOUT.storageKey, "1");
    } catch {}
    setIsOpen(false);
    setShowClaraNudge(false);
    void logFunnelEvent({ event_type: "human_help_dismissed", metadata: { trigger_reason: reason } });
  };

  const call = () => {
    try {
      sessionStorage.setItem(CONTRACTOR_HUMAN_CALLOUT.storageKey, "1");
    } catch {}
    window.location.href = `tel:${CONTRACTOR_HUMAN_CALLOUT.phoneTel}`;
    setIsOpen(false);
    void logFunnelEvent({ event_type: "human_help_call_clicked", metadata: { trigger_reason: reason } });
  };

  const continueWithClara = () => {
    setIsOpen(false);
    setShowClaraNudge(false);
    sessionStorage.setItem(CONTRACTOR_HUMAN_CALLOUT.storageKey, "1");
    void logFunnelEvent({ event_type: "human_help_continue_clara", metadata: { trigger_reason: reason } });
  };

  return { isOpen, showClaraNudge, reason, dismiss, call, continueWithClara };
}
