export const CONTRACTOR_HUMAN_CALLOUT = {
  phoneDisplay: "(514) 249-9522",
  phoneTel: "+15142499522",
  minDwellMs: 15000,
  storageKey: "unpro:contractor_human_popup_shown",
  nudgeStorageKey: "unpro:contractor_human_nudge_shown",
  hours: "Lun–Ven · 8h–18h (HE)",
  title: "Besoin d'aide pour continuer?",
  subtitle: "Parlez à un humain maintenant.",
  primaryCta: "Appeler",
  secondaryCta: "Continuer avec Clara",
  // Path prefixes that indicate contractor intent
  contractorPathPrefixes: [
    "/entrepreneur",
    "/contractor",
    "/aipp",
    "/pro/",
    "/leads",
    "/demo/isroyal-alex-plan-test",
  ],
};

export function isContractorSurface(pathname: string, search: string): boolean {
  const params = new URLSearchParams(search);
  if (params.get("intent") === "contractor") return true;
  if (params.get("role") === "contractor") return true;
  return CONTRACTOR_HUMAN_CALLOUT.contractorPathPrefixes.some((p) =>
    pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p)
  );
}
