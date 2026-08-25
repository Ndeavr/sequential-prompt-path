/**
 * AdminSectionTabs — horizontal sub-navigation for a primary admin section.
 *
 * Rendered once by <AdminLayout>, driven entirely by `adminSections` config,
 * so no individual admin page had to be modified. Scrolls horizontally on
 * mobile with large tap targets and a clear active state.
 */
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import type { AdminSection } from "@/config/adminNav";

interface Props {
  section: AdminSection;
  pathname: string;
}

export default function AdminSectionTabs({ section, pathname }: Props) {
  const activeRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [pathname]);

  return (
    <nav
      aria-label={`${section.label} sections`}
      className="sticky top-0 z-20 -mx-4 md:-mx-8 border-b border-border/30 bg-background/90 backdrop-blur-xl"
    >
      <div className="flex gap-1 overflow-x-auto px-4 md:px-8 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {section.tabs.map((tab) => {
          const active = pathname === tab.to;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.to}
              to={tab.to}
              ref={active ? activeRef : undefined}
              aria-current={active ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 min-h-[40px] text-[13px] font-medium transition ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
