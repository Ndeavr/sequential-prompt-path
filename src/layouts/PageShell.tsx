/**
 * PageShell — canonical page wrapper for every UNPRO page.
 *
 * Every page (via a layout or directly) MUST render its content inside a
 * <PageShell>. It owns:
 *   • the single dock-safe padding-bottom token
 *   • horizontal overflow clip + isolation
 *   • the `data-page-shell` marker used by <MobileQAOverlay> and
 *     /admin/site-health to detect layout regressions
 *
 * Pages must NEVER mount <BottomDockGlass /> or <MobileBottomNav /> — those
 * are mounted exactly once by <MainLayout>. Runtime singleton guards in
 * both components will unmount duplicates and log a red console error.
 */

import type { ElementType, ReactNode, CSSProperties } from "react";
import { useEffect } from "react";
import { logVisualEvent } from "@/lib/visualStabilityLogger";
import PageCTAFooter from "@/components/cta/PageCTAFooter";
import type { CanonicalCTA } from "@/config/ctaRegistry";

type Variant = "marketing" | "app" | "admin";

interface PageShellProps {
  children: ReactNode;
  as?: ElementType;
  variant?: Variant;
  /** Adds horizontal padding suited to the variant. Default true. */
  padded?: boolean;
  /** Reserves space above the fixed mobile dock. Default true. */
  dockSafe?: boolean;
  /** Applies `isolate overflow-x-clip` to contain decorative layers. Default true. */
  isolate?: boolean;
  /** Escape hatch for immersive/full-bleed screens (checkout, Alex voice). */
  fullBleed?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Human-readable page id used by the QA scanner and logs. */
  id?: string;
  /**
   * Canonical CTAs shown in the auto-injected footer when the page does not
   * render its own. Pass `false` to opt out (immersive/full-bleed screens).
   */
  cta?: CanonicalCTA | CanonicalCTA[] | false;
}

const variantClasses: Record<Variant, string> = {
  marketing: "min-h-[100svh] w-full max-w-full",
  app: "min-h-[100svh] w-full max-w-full",
  admin: "min-h-[100svh] w-full max-w-full",
};

export default function PageShell({
  children,
  as,
  variant = "marketing",
  padded = true,
  dockSafe = true,
  isolate = true,
  fullBleed = false,
  className = "",
  style,
  id,
  cta = false,
}: PageShellProps) {
  const Tag = (as ?? "main") as ElementType;

  useEffect(() => {
    if (typeof document === "undefined") return;
    const n = document.querySelectorAll("[data-page-shell]").length;
    if (n > 1) {
      logVisualEvent("repeated_mount_detected", { component: "PageShell", count: n, id });
    }
  }, [id]);

  // Only inject the auto footer if the page didn't render its own CTA.
  // We check after mount via a data attribute lookup performed by the QA
  // overlay; here we simply render the footer unless opted out.
  const ctas: CanonicalCTA[] =
    cta === false ? [] : Array.isArray(cta) ? cta : [cta];

  const classes = [
    variantClasses[variant],
    isolate ? "isolate overflow-x-clip [contain:paint]" : "",
    dockSafe ? "pb-[var(--dock-safe-pb)]" : "",
    padded && !fullBleed ? "" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag
      data-page-shell={id ?? variant}
      data-page-shell-variant={variant}
      className={classes}
      style={style}
    >
      {children}
      {ctas.length > 0 && !fullBleed && <PageCTAFooter ctas={ctas} />}
    </Tag>
  );
}
