/**
 * legacyPlanGuard — DEV-only runtime regression guard.
 *
 * Scans visible DOM text for forbidden legacy plan names
 * (Essentiel, Starter, Basic, Découverte) and screams loudly
 * in the console when one appears. Never runs in production.
 *
 * This is a backstop — the real fix is to remove every reference,
 * but this catches regressions introduced by future code changes.
 */

import { FORBIDDEN_LEGACY_PLAN_NAMES } from "@/config/pricing";

let installed = false;

function scanNode(root: Node): string[] {
  const found = new Set<string>();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null = walker.nextNode();
  while (node) {
    const text = (node.nodeValue ?? "").toLowerCase();
    for (const banned of FORBIDDEN_LEGACY_PLAN_NAMES) {
      // Word-boundary match to avoid false positives like "essentiel" inside French sentences
      const re = new RegExp(`(^|[^a-zà-ÿ])${banned}([^a-zà-ÿ]|$)`, "i");
      if (re.test(text)) {
        // Heuristic: only flag if the surrounding text mentions plan/tier/abonnement/pricing
        const sample = (node.parentElement?.textContent ?? text).toLowerCase();
        if (/(plan|forfait|abonnement|tarif|tier|pricing|prix)/i.test(sample)) {
          found.add(banned);
        }
      }
    }
    node = walker.nextNode();
  }
  return [...found];
}

export function installLegacyPlanGuard(): void {
  if (installed) return;
  if (typeof window === "undefined") return;
  if (import.meta.env?.PROD) return; // dev / preview only
  installed = true;

  const report = (offenders: string[]) => {
    if (offenders.length === 0) return;
    // eslint-disable-next-line no-console
    console.error(
      `%c[UNPRO] Legacy plan name(s) detected in UI: ${offenders.join(", ")}\n` +
        `Use CONTRACTOR_PLANS from src/config/pricing.ts (Recrue / Pro / Premium / Élite / Signature).`,
      "background:#7f1d1d;color:#fff;padding:4px 8px;border-radius:4px;font-weight:bold;",
    );
  };

  // Initial pass after first paint
  requestAnimationFrame(() => report(scanNode(document.body)));

  // Observe future mutations (debounced)
  let pending: number | null = null;
  const observer = new MutationObserver(() => {
    if (pending !== null) return;
    pending = window.setTimeout(() => {
      pending = null;
      report(scanNode(document.body));
    }, 800);
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
}
