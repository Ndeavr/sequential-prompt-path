import { useEffect, useState } from "react";
import { CONTRACTOR_HUMAN_CALLOUT, isContractorSurface } from "@/config/contractorHumanCallout";

export function useContractorHumanCallout() {
  const [isOpen, setIsOpen] = useState(false);
  const [pathKey, setPathKey] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onChange = () => setPathKey((k) => k + 1);
    window.addEventListener("popstate", onChange);
    // Patch pushState/replaceState to detect SPA navigation
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

    if (!isContractorSurface(window.location.pathname, window.location.search)) return;

    const t = window.setTimeout(() => setIsOpen(true), CONTRACTOR_HUMAN_CALLOUT.delayMs);
    return () => window.clearTimeout(t);
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
