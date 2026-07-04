/**
 * layoutGuards — pure DOM inspection helpers used by <MobileQAOverlay>
 * and /admin/site-health. No side effects; safe to call any time on the
 * client. All functions no-op during SSR.
 */

import { logVisualEvent } from "./visualStabilityLogger";

export interface LayoutScan {
  timestamp: number;
  viewport: { w: number; h: number };
  duplicateDocks: number;
  horizontalOverflow: number; // px overflow beyond viewport (0 = ok)
  largeGaps: Array<{ afterIndex: number; gapPx: number }>;
  contentBehindDock: boolean;
  pageShellsFound: number;
  missingCanonicalCTA: boolean;
  placeholderText: string[];
}

const PLACEHOLDER_RE = /coming soon|bient[oô]t disponible|placeholder|lorem ipsum/i;

const DOCK_HEIGHT_FALLBACK = 88;
const GAP_WARN_PX = 48;
const GAP_FAIL_PX = 80;

function readDockHeight(): number {
  if (typeof window === "undefined") return DOCK_HEIGHT_FALLBACK;
  const el = document.querySelector<HTMLElement>("[data-bottom-dock]");
  if (!el) return DOCK_HEIGHT_FALLBACK;
  const r = el.getBoundingClientRect();
  return Math.max(r.height, 48);
}

export function scanLayout(): LayoutScan {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return {
      timestamp: Date.now(),
      viewport: { w: 0, h: 0 },
      duplicateDocks: 0,
      horizontalOverflow: 0,
      largeGaps: [],
      contentBehindDock: false,
      pageShellsFound: 0,
      missingCanonicalCTA: false,
      placeholderText: [],
    };
  }

  const docks = document.querySelectorAll("[data-bottom-dock]");
  const duplicateDocks = docks.length;

  const horizontalOverflow = Math.max(
    0,
    document.documentElement.scrollWidth - window.innerWidth,
  );

  const shell = document.querySelector<HTMLElement>("[data-page-shell]");
  const largeGaps: LayoutScan["largeGaps"] = [];
  if (shell) {
    const children = Array.from(shell.children) as HTMLElement[];
    for (let i = 0; i < children.length - 1; i++) {
      const a = children[i].getBoundingClientRect();
      const b = children[i + 1].getBoundingClientRect();
      const gap = b.top - a.bottom;
      if (gap > GAP_WARN_PX) largeGaps.push({ afterIndex: i, gapPx: Math.round(gap) });
    }
  }

  let contentBehindDock = false;
  const dockH = readDockHeight();
  if (window.innerWidth < 1024 && duplicateDocks > 0) {
    // Sample the horizontal mid-point at the top of the dock rectangle.
    const y = window.innerHeight - dockH - 4;
    const x = Math.floor(window.innerWidth / 2);
    const el = document.elementFromPoint(x, y);
    if (el) {
      const inDock = el.closest("[data-bottom-dock]");
      const hostShell = el.closest("[data-page-shell]");
      if (!inDock && hostShell) {
        // Content sits behind the dock only if this pixel is *inside* a
        // shell but *not* inside the dock — i.e. the shell has too little
        // padding-bottom. If the shell owns the padding correctly, this
        // pixel is the padded gap and elementFromPoint returns the shell.
        const shellRect = hostShell.getBoundingClientRect();
        contentBehindDock =
          y > shellRect.top && y < shellRect.bottom &&
          el !== hostShell;
      }
    }
  }

  return {
    timestamp: Date.now(),
    viewport: { w: window.innerWidth, h: window.innerHeight },
    duplicateDocks,
    horizontalOverflow,
    largeGaps,
    contentBehindDock,
    pageShellsFound: document.querySelectorAll("[data-page-shell]").length,
  };
}

export function assertSingleDock(): boolean {
  if (typeof document === "undefined") return true;
  const n = document.querySelectorAll("[data-bottom-dock]").length;
  if (n > 1) {
    logVisualEvent("repeated_mount_detected", { component: "BottomDock", count: n });
  }
  return n <= 1;
}

export const LAYOUT_QA_THRESHOLDS = {
  GAP_WARN_PX,
  GAP_FAIL_PX,
} as const;
