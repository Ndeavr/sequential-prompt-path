/**
 * MobileQAOverlay — floating badge that surfaces layout regressions live.
 *
 * Visible only in dev, when `?qa=1` is present, or when localStorage flag
 * `unpro_qa_overlay=1` is set. Never rendered for regular visitors.
 *
 * Runs scanLayout() every second and emits events to visualStabilityLogger
 * so /admin/site-health picks them up in production too.
 */

import { useEffect, useState } from "react";
import { scanLayout, LAYOUT_QA_THRESHOLDS, type LayoutScan } from "@/lib/layoutGuards";
import { logVisualEvent } from "@/lib/visualStabilityLogger";

function isEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (import.meta.env.DEV) return true;
  try {
    const u = new URL(window.location.href);
    if (u.searchParams.get("qa") === "1") return true;
    if (window.localStorage.getItem("unpro_qa_overlay") === "1") return true;
  } catch {
    /* ignore */
  }
  return false;
}

function badgeTone(scan: LayoutScan): "ok" | "warn" | "fail" {
  if (
    scan.duplicateDocks > 1 ||
    scan.horizontalOverflow > 0 ||
    scan.contentBehindDock ||
    scan.placeholderText.length > 0 ||
    scan.largeGaps.some((g) => g.gapPx > LAYOUT_QA_THRESHOLDS.GAP_FAIL_PX)
  ) {
    return "fail";
  }
  if (scan.largeGaps.length > 0 || scan.missingCanonicalCTA) return "warn";
  return "ok";
}

export default function MobileQAOverlay() {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [scan, setScan] = useState<LayoutScan | null>(null);

  useEffect(() => setEnabled(isEnabled()), []);

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const tick = () => {
      const s = scanLayout();
      setScan(s);
      const tone = badgeTone(s);
      if (tone === "fail") {
        logVisualEvent("section_rendered_empty", {
          source: "MobileQAOverlay",
          duplicateDocks: s.duplicateDocks,
          horizontalOverflow: s.horizontalOverflow,
          contentBehindDock: s.contentBehindDock,
          largeGaps: s.largeGaps,
        });
      }
    };
    tick();
    const id = window.setInterval(tick, import.meta.env.DEV ? 1000 : 5000);
    const onResize = () => (raf = window.requestAnimationFrame(tick));
    window.addEventListener("resize", onResize);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("resize", onResize);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [enabled]);

  if (!enabled || !scan) return null;

  const tone = badgeTone(scan);
  const toneStyle: Record<typeof tone, string> = {
    ok: "bg-emerald-500 text-white",
    warn: "bg-amber-500 text-black",
    fail: "bg-red-600 text-white",
  };

  return (
    <div
      style={{ position: "fixed", left: 12, bottom: 12, zIndex: 9999 }}
      aria-hidden
      data-mobile-qa-overlay
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`px-2.5 py-1 rounded-full text-[11px] font-bold shadow-lg ${toneStyle[tone]}`}
        title="UNPRO layout QA"
      >
        QA · {scan.viewport.w}px · {tone.toUpperCase()}
      </button>
      {open && (
        <div className="mt-2 w-[280px] rounded-xl bg-black/85 text-white text-[11px] p-3 space-y-1 font-mono shadow-2xl">
          <div>viewport: {scan.viewport.w}×{scan.viewport.h}</div>
          <div>docks: {scan.duplicateDocks} {scan.duplicateDocks > 1 ? "❌ duplicate" : "✓"}</div>
          <div>h-overflow: {scan.horizontalOverflow}px {scan.horizontalOverflow ? "❌" : "✓"}</div>
          <div>behind-dock: {scan.contentBehindDock ? "❌ yes" : "✓ no"}</div>
          <div>canonical-cta: {scan.missingCanonicalCTA ? "⚠ missing" : "✓"}</div>
          <div>placeholder-text: {scan.placeholderText.length ? `❌ ${scan.placeholderText[0]}` : "✓"}</div>
          <div>page-shells: {scan.pageShellsFound}</div>
          <div>
            large-gaps: {scan.largeGaps.length}
            {scan.largeGaps.slice(0, 3).map((g, i) => (
              <div key={i} className="opacity-80 pl-2">
                after #{g.afterIndex}: {g.gapPx}px
              </div>
            ))}
          </div>
          <div className="opacity-60 pt-1 border-t border-white/10">
            warn &gt; {LAYOUT_QA_THRESHOLDS.GAP_WARN_PX}px · fail &gt; {LAYOUT_QA_THRESHOLDS.GAP_FAIL_PX}px
          </div>
        </div>
      )}
    </div>
  );
}
