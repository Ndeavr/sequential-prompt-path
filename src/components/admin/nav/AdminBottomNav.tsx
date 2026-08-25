/**
 * AdminBottomNav — the five primary operator destinations on mobile.
 *
 * Replaces the generic <MobileBottomNav> inside /admin so the sidebar drawer
 * and the dock never duplicate each other. Registers the canonical
 * `data-bottom-dock` marker so layout guards keep working (and so the generic
 * dock's singleton guard defers to this one).
 */
import { Link, useLocation } from "react-router-dom";
import { adminSections } from "@/config/adminNav";

function isSectionActive(pathname: string, to: string, match: string[] = []) {
  if (to === "/admin") {
    if (pathname === "/admin") return true;
    return match.some((m) => pathname === m || pathname.startsWith(m + "/"));
  }
  if (pathname === to || pathname.startsWith(to + "/")) return true;
  return match.some((m) => pathname === m || pathname.startsWith(m + "/"));
}

export default function AdminBottomNav() {
  const { pathname } = useLocation();

  return (
    <nav
      data-bottom-dock="admin"
      aria-label="Admin navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border/40 bg-background/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex items-stretch justify-around">
        {adminSections.map((section) => {
          const active = isSectionActive(pathname, section.to, section.match);
          const Icon = section.icon;
          return (
            <Link
              key={section.key}
              to={section.to}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center justify-center gap-1 min-h-[56px] py-2 transition ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-[19px] w-[19px]" />
              <span className="text-[10px] font-medium leading-none">{section.shortLabel}</span>
              <span
                className={`h-0.5 w-4 rounded-full transition ${active ? "bg-primary" : "bg-transparent"}`}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
