import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { CONTRACTOR_HUMAN_CALLOUT, isContractorSurface } from "@/config/contractorHumanCallout";

export function useContractorHumanCallout() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(CONTRACTOR_HUMAN_CALLOUT.storageKey)) return;
    } catch {}

    if (!isContractorSurface(location.pathname, location.search)) return;

    const t = window.setTimeout(() => setIsOpen(true), CONTRACTOR_HUMAN_CALLOUT.delayMs);
    return () => window.clearTimeout(t);
  }, [location.pathname, location.search]);

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
