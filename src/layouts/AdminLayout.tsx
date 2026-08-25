/**
 * UNPRO — Admin Layout (Operator v3)
 *
 * Five primary destinations (Dashboard, Acquisition, Entrepreneurs,
 * Rendez-vous, Revenus). Sub-destinations render as a tab bar under the
 * header, driven by `adminSections` — no page had to change.
 *
 * Affiliés is a clearly separated secondary destination; every diagnostic /
 * internal-architecture page lives in the collapsed "Operations / Avancé"
 * section. No route was removed: deep links stay valid.
 *
 * Mobile: the dock owns the five primary destinations, the drawer owns
 * secondary + advanced + search. They never duplicate each other.
 */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LogOut, Menu, X, ChevronDown, ChevronRight, Search, Layers,
} from "lucide-react";
import UnproLogo from "@/components/brand/UnproLogo";
import BannerSystemEnvironmentStatus from "@/components/admin/system/BannerSystemEnvironmentStatus";
import SmsInfrastructureBanner from "@/components/admin/SmsInfrastructureBanner";
import RevenueWall from "@/components/admin/RevenueWall";
import AdminSectionTabs from "@/components/admin/nav/AdminSectionTabs";
import AdminBottomNav from "@/components/admin/nav/AdminBottomNav";
import {
  adminSections, adminSecondaryGroup, adminAdvancedGroups,
  type AdminSection, type NavGroup, type NavLeaf,
} from "@/config/adminNav";
import { useAdminPageTracking } from "@/hooks/useAdminPageTracking";
import type { ReactNode } from "react";

const ADVANCED_KEY = "admin.nav.advancedOpen";
const OPEN_GROUP_KEY = "admin.nav.openGroup";
const HIDDEN_KEY = "admin.nav.hidden";

function readHidden(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY) || "[]")); }
  catch { return new Set(); }
}

export function resolveActiveSection(pathname: string): AdminSection | null {
  let best: { section: AdminSection; score: number } | null = null;
  for (const section of adminSections) {
    const candidates = [section.to, ...(section.match ?? [])];
    for (const c of candidates) {
      const exact = pathname === c;
      const nested = c !== "/admin" && pathname.startsWith(c + "/");
      if (!exact && !nested) continue;
      const score = c.length + (exact ? 1000 : 0);
      if (!best || score > best.score) best = { section, score };
    }
    for (const tab of section.tabs) {
      if (pathname === tab.to) {
        const score = tab.to.length + 2000;
        if (!best || score > best.score) best = { section, score };
      }
    }
  }
  return best?.section ?? null;
}

/* ---------------------------- shared pieces ---------------------------- */

const LeafLink = ({ to, label, icon: Icon, pathname, onNavigate, inset = true }: NavLeaf & {
  pathname: string; onNavigate?: () => void; inset?: boolean;
}) => {
  const active = pathname === to;
  return (
    <Link
      to={to}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2.5 rounded-lg px-3 ${inset ? "pl-8" : ""} py-2 text-[13px] font-medium transition min-h-[40px] ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
};

const CollapsibleGroup = ({ group, pathname, onNavigate, forceOpen, openKey, setOpenKey }: {
  group: NavGroup; pathname: string; onNavigate?: () => void;
  forceOpen?: boolean; openKey: string | null; setOpenKey: (k: string | null) => void;
}) => {
  const isOnGroup = group.items.some((i) => pathname === i.to);
  const expanded = forceOpen || openKey === group.key || isOnGroup;
  const Icon = group.icon;

  return (
    <div>
      <button
        onClick={() => setOpenKey(expanded && !isOnGroup ? null : group.key)}
        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition min-h-[42px] ${
          isOnGroup ? "text-primary bg-primary/5" : "text-foreground/90 hover:bg-muted/40"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">{group.label}</span>
        <span className="text-[10px] text-muted-foreground">{group.items.length}</span>
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      {expanded && (
        <div className="mt-0.5 space-y-0.5">
          {group.items.map((item) => (
            <LeafLink key={item.to} {...item} pathname={pathname} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
};

/** Search across every destination in the whole admin. */
const SearchResults = ({ q, pathname, onNavigate }: { q: string; pathname: string; onNavigate?: () => void }) => {
  const hidden = readHidden();
  const all: NavLeaf[] = [
    ...adminSections.flatMap((s) => s.tabs),
    ...adminSecondaryGroup.items,
    ...adminAdvancedGroups.flatMap((g) => g.items),
  ].filter((i) => !hidden.has(i.to));

  const seen = new Set<string>();
  const results = all.filter((i) => {
    if (seen.has(i.to)) return false;
    seen.add(i.to);
    return i.label.toLowerCase().includes(q);
  });

  if (results.length === 0) {
    return <p className="text-xs text-muted-foreground px-3 py-4 text-center">Aucun résultat.</p>;
  }
  return (
    <div className="space-y-0.5">
      {results.map((i) => (
        <LeafLink key={i.to} {...i} pathname={pathname} onNavigate={onNavigate} inset={false} />
      ))}
    </div>
  );
};

/* ------------------------------ sidebar nav ---------------------------- */

const AdminNav = ({ pathname, onNavigate, showPrimary }: {
  pathname: string; onNavigate?: () => void; showPrimary: boolean;
}) => {
  const [query, setQuery] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(() => localStorage.getItem(OPEN_GROUP_KEY));
  const [advancedOpen, setAdvancedOpen] = useState<boolean>(() => localStorage.getItem(ADVANCED_KEY) === "1");

  useEffect(() => {
    if (openKey) localStorage.setItem(OPEN_GROUP_KEY, openKey);
    else localStorage.removeItem(OPEN_GROUP_KEY);
  }, [openKey]);

  useEffect(() => {
    localStorage.setItem(ADVANCED_KEY, advancedOpen ? "1" : "0");
  }, [advancedOpen]);

  const q = query.trim().toLowerCase();
  const activeSection = useMemo(() => resolveActiveSection(pathname), [pathname]);

  return (
    <div className="space-y-1.5">
      <div className="relative px-1 mb-2 sticky top-0 bg-card/80 backdrop-blur-sm pt-1 pb-2 z-10">
        <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher une page…"
          className="h-9 pl-8 text-xs rounded-lg bg-muted/30 border-border/40"
        />
      </div>

      {q ? (
        <SearchResults q={q} pathname={pathname} onNavigate={onNavigate} />
      ) : (
        <>
          {showPrimary && (
            <div className="space-y-0.5">
              {adminSections.map((section) => {
                const active = activeSection?.key === section.key;
                const Icon = section.icon;
                return (
                  <div key={section.key}>
                    <Link
                      to={section.to}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition min-h-[42px] ${
                        active ? "bg-primary/10 text-primary" : "text-foreground/90 hover:bg-muted/40"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 text-left">{section.label}</span>
                    </Link>
                    {active && (
                      <div className="mt-0.5 space-y-0.5">
                        {section.tabs.map((tab) => (
                          <LeafLink key={tab.to} {...tab} pathname={pathname} onNavigate={onNavigate} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-2 mt-2 border-t border-border/30">
            <CollapsibleGroup
              group={adminSecondaryGroup}
              pathname={pathname}
              onNavigate={onNavigate}
              openKey={openKey}
              setOpenKey={setOpenKey}
            />
          </div>

          <div className="pt-2 mt-2 border-t border-border/30">
            <button
              onClick={() => setAdvancedOpen((v) => !v)}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground hover:bg-muted/40 transition min-h-[42px]"
            >
              <Layers className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">Operations / Avancé</span>
              {advancedOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
            {advancedOpen && (
              <div className="mt-1 space-y-1">
                {adminAdvancedGroups.map((group) => (
                  <CollapsibleGroup
                    key={group.key}
                    group={group}
                    pathname={pathname}
                    onNavigate={onNavigate}
                    openKey={openKey}
                    setOpenKey={setOpenKey}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

/* -------------------------------- layout ------------------------------- */

/** Idempotency guard: pages that still self-wrap render children only. */
const AdminLayoutDepth = createContext(0);

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const depth = useContext(AdminLayoutDepth);
  if (depth > 0) return <>{children}</>;
  return (
    <AdminLayoutDepth.Provider value={1}>
      <AdminLayoutShell>{children}</AdminLayoutShell>
    </AdminLayoutDepth.Provider>
  );
};

const AdminLayoutShell = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  const { signOut, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useAdminPageTracking();

  const activeSection = useMemo(() => resolveActiveSection(pathname), [pathname]);

  return (
    <div className="admin-theme min-h-screen flex bg-background">
      <aside className="hidden md:flex w-64 flex-col border-r border-border/30 bg-card/40 p-3 sticky top-0 h-screen">
        <Link to="/" className="flex items-center gap-2 px-3 mb-1 mt-2">
          <UnproLogo size={90} className="h-6 w-auto" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground ml-1">Admin</span>
        </Link>

        <nav className="flex-1 min-h-0 overflow-y-auto mt-3 pr-1">
          <AdminNav pathname={pathname} showPrimary />
        </nav>

        <div className="border-t border-border/30 pt-3 mt-3 space-y-2">
          <p className="text-[11px] text-muted-foreground px-3 truncate">{user?.email}</p>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 rounded-lg text-xs h-8" onClick={signOut}>
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <BannerSystemEnvironmentStatus />
        <SmsInfrastructureBanner />
        <RevenueWall />

        <header className="md:hidden flex items-center justify-between border-b border-border/30 px-4 py-2.5 bg-background/80 backdrop-blur-xl sticky top-0 z-30">
          <Link to="/" className="flex items-center gap-2">
            <UnproLogo size={84} className="h-5 w-auto" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {activeSection?.label ?? "Admin"}
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            className="h-10 w-10 rounded-lg"
            onClick={() => setMobileMenuOpen((v) => !v)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </header>

        {mobileMenuOpen && (
          <>
            <div className="md:hidden fixed inset-0 bg-black/50 z-30 top-[45px]" onClick={() => setMobileMenuOpen(false)} />
            <div className="md:hidden fixed top-[45px] left-0 right-0 bottom-0 z-40 bg-card border-b border-border/30 overflow-y-auto p-3 pb-24">
              {/* The five primary destinations live in the bottom dock on mobile,
                  so the drawer only carries secondary + advanced + search. */}
              <AdminNav pathname={pathname} onNavigate={() => setMobileMenuOpen(false)} showPrimary={false} />
              <div className="border-t border-border/30 pt-3 mt-3 space-y-2">
                <p className="text-[11px] text-muted-foreground px-3 truncate">{user?.email}</p>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 rounded-lg text-xs h-9" onClick={signOut}>
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </Button>
              </div>
            </div>
          </>
        )}

        <main className="flex-1 px-4 md:px-8 overflow-auto pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-8">
          {activeSection && <AdminSectionTabs section={activeSection} pathname={pathname} />}
          <div className="pt-4 md:pt-6">{children}</div>
        </main>
      </div>

      <AdminBottomNav />
    </div>
  );
};

export default AdminLayout;
