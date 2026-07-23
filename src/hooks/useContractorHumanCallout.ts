import { useEffect, useState } from "react";
import { CONTRACTOR_HUMAN_CALLOUT, isContractorSurface } from "@/config/contractorHumanCallout";

const INPUT_SELECTOR = 'input, textarea, select, [contenteditable="true"]';
const INPUT_IDLE_MS = 8000;
const RECHECK_MS = 5000;

function isUserTyping(): boolean {
  if (typeof document === "undefined") return false;
  const el = document.activeElement;
  if (el && el.matches?.(INPUT_SELECTOR)) return true;
  return false;
}

export function useContractorHumanCallout() {
  const [isOpen, setIsOpen] = useState(false);
  const [pathKey, setPathKey] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onChange = () => setPathKey((k) => k + 1);
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
    // Never show the human callout on post-payment / profile surfaces.
    const EXCLUDED_PREFIXES = ["/pro/welcome", "/pro/profile", "/pro/onboarding", "/contractor/activated"];
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

    let lastInputAt = 0;
    let timer: number | null = null;
    let cancelled = false;

    const onInput = () => {
      lastInputAt = Date.now();
    };
    document.addEventListener("focusin", onInput, true);
    document.addEventListener("input", onInput, true);
    document.addEventListener("keydown", onInput, true);

    const tryOpen = () => {
      if (cancelled) return;
      if (isUserTyping() || Date.now() - lastInputAt < INPUT_IDLE_MS) {
        timer = window.setTimeout(tryOpen, RECHECK_MS);
        return;
      }
      setIsOpen(true);
    };

    timer = window.setTimeout(tryOpen, CONTRACTOR_HUMAN_CALLOUT.delayMs);

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      document.removeEventListener("focusin", onInput, true);
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("keydown", onInput, true);
    };
  }, [pathKey]);

  const dismiss = () => {
    try {
      sessionStorage.setItem(CONTRACTOR_HUMAN_CALLOUT.storageKey, "1");
    } catch {}
    setIsOpen(false);
  };

  const call = () => {
    try {
      sessionStorage.setItem(CONTRACTOR_HUMAN_CALLOUT.storageKey, "1");
    } catch {}
    window.location.href = `tel:${CONTRACTOR_HUMAN_CALLOUT.phoneTel}`;
    setIsOpen(false);
  };

  return { isOpen, dismiss, call };
}
