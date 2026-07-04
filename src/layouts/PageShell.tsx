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
}: PageShellProps) {
  const Tag = (as ?? "main") as ElementType;

  useEffect(() => {
    // If two page shells mount at once we've nested layouts by accident.
    if (typeof document === "undefined") return;
    const n = document.querySelectorAll("[data-page-shell]").length;
    if (n > 1) {
      logVisualEvent("repeated_mount_detected", { component: "PageShell", count: n, id });
    }
  }, [id]);

  const classes = [
    variantClasses[variant],
    isolate ? "isolate overflow-x-clip" : "",
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
    </Tag>
  );
}
