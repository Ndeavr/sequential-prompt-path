/**
 * UNPRO — Admin Layout (Simplified v1)
 * 6 top-level sections, collapsed by default, Labs hidden by default.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  LogOut, Menu, X, Sparkles, ChevronDown, ChevronRight, Search,
} from "lucide-react";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";
import BannerSystemEnvironmentStatus from "@/components/admin/system/BannerSystemEnvironmentStatus";
import SmsInfrastructureBanner from "@/components/admin/SmsInfrastructureBanner";
import { adminNavGroups, type NavGroup, type NavLeaf } from "@/config/adminNav";
import { useAdminPageTracking } from "@/hooks/useAdminPageTracking";
import type { ReactNode } from "react";

const OPEN_KEY = "admin.nav.openGroup";
const LABS_KEY = "admin.nav.showLabs";
const HIDDEN_KEY = "admin.nav.hidden";

function readHidden(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY) || "[]")); }
  catch { return new Set(); }
}

const NavLink = ({ to, label, icon: Icon, pathname, onNavigate }: NavLeaf & { pathname: string; onNavigate?: () => void }) => {
  const active = pathname === to || (to !== "/admin" && pathname.startsWith(to + "/"));
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 pl-8 text-[13px] font-medium transition min-h-[36px] ${
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

const NavGroupItem = ({
  group, pathname, onNavigate, forceOpen, openKey, setOpenKey,
}: {
  group: NavGroup; pathname: string; onNavigate?: () => void;
  forceOpen?: boolean; openKey: string | null; setOpenKey: (k: string | null) => void;
}) => {
  const isOnGroup = group.items.some(i => pathname === i.to || (i.to !== "/admin" && pathname.startsWith(i.to + "/")));
  const expanded = forceOpen || openKey === group.key || isOnGroup;

  return (
    <div>
      <button
        onClick={() => setOpenKey(expanded && !isOnGroup ? null : group.key)}
        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition min-h-[40px] ${
          isOnGroup ? "text-primary bg-primary/5" : "text-foreground/90 hover:bg-muted/40"
        }`}
      >
        <group.icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">{group.label}</span>
        <span className="text-[10px] text-muted-foreground">{group.items.length}</span>
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      {expanded && (
        <div className="mt-0.5 space-y-0.5">
          {group.items.map(item => <NavLink key={item.to} {...item} pathname={pathname} onNavigate={onNavigate} />)}
        </div>
      )}
    </div>
  );
};

const Nav = ({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) => {
  const [query, setQuery] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(() => localStorage.getItem(OPEN_KEY));
  const [showLabs, setShowLabs] = useState<boolean>(() => localStorage.getItem(LABS_KEY) === "1");
  const [hidden, setHidden] = useState<Set<string>>(readHidden);

  useEffect(() => {
    const onChange = () => setHidden(readHidden());
    window.addEventListener("admin.nav.hidden.changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("admin.nav.hidden.changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  useEffect(() => {
    if (openKey) localStorage.setItem(OPEN_KEY, openKey);
    else localStorage.removeItem(OPEN_KEY);
  }, [openKey]);

  useEffect(() => {
    localStorage.setItem(LABS_KEY, showLabs ? "1" : "0");
  }, [showLabs]);

  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    const groups = adminNavGroups
      .filter(g => showLabs || !g.defaultHidden)
      .map(g => ({ ...g, items: g.items.filter(i => !hidden.has(i.to)) }))
      .filter(g => g.items.length > 0);
    if (!q) return groups;
    return groups
      .map(g => ({ ...g, items: g.items.filter(i => i.label.toLowerCase().includes(q)) }))
      .filter(g => g.items.length > 0);
  }, [q, showLabs, hidden]);

  return (
    <div className="space-y-1.5">
      <div className="relative px-1 mb-2 sticky top-0 bg-card/80 backdrop-blur-sm pt-1 pb-2 z-10">
        <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search…"
          className="h-8 pl-8 text-xs rounded-lg bg-muted/30 border-border/40"
        />
      </div>
      {filtered.map(group => (
        <NavGroupItem
          key={group.key} group={group} pathname={pathname} onNavigate={onNavigate}
          forceOpen={!!q} openKey={openKey} setOpenKey={setOpenKey}
        />
      ))}
      {filtered.length === 0 && (
        <p className="text-xs text-muted-foreground px-3 py-4 text-center">No results.</p>
      )}
      <div className="flex items-center justify-between px-3 pt-3 mt-2 border-t border-border/30">
        <label htmlFor="labs-toggle" className="text-[11px] font-medium text-muted-foreground cursor-pointer">
          Show Labs
        </label>
        <Switch id="labs-toggle" checked={showLabs} onCheckedChange={setShowLabs} />
      </div>
    </div>
  );
};

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  const { signOut, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useAdminPageTracking();

  return (
    <div className="admin-theme min-h-screen flex bg-background">
      <aside className="hidden md:flex w-64 flex-col border-r border-border/30 bg-card/40 p-3 sticky top-0 h-screen">
        <Link to="/" className="flex items-center gap-2 px-3 mb-1 mt-2">
          <div className="h-6 w-6 rounded-md bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Sparkles className="h-3 w-3 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold text-foreground">UNPRO</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground ml-1">Admin</span>
        </Link>

        <nav className="flex-1 min-h-0 overflow-y-auto mt-3 pr-1">
          <Nav pathname={pathname} />
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
        <header className="md:hidden flex items-center justify-between border-b border-border/30 px-4 py-2.5 bg-background/80 backdrop-blur-xl sticky top-0 z-30">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Sparkles className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold text-foreground">UNPRO Admin</span>
          </Link>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setMobileMenuOpen(v => !v)}>
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </header>

        {mobileMenuOpen && (
          <>
            <div className="md:hidden fixed inset-0 bg-black/50 z-30 top-[45px]" onClick={() => setMobileMenuOpen(false)} />
            <div className="md:hidden fixed top-[45px] left-0 right-0 bottom-0 z-40 bg-card border-b border-border/30 overflow-y-auto p-3 pb-[env(safe-area-inset-bottom)]">
              <Nav pathname={pathname} onNavigate={() => setMobileMenuOpen(false)} />
              <div className="border-t border-border/30 pt-3 mt-3 space-y-2">
                <p className="text-[11px] text-muted-foreground px-3 truncate">{user?.email}</p>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 rounded-lg text-xs h-8" onClick={signOut}>
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </Button>
              </div>
            </div>
          </>
        )}

        <main className="flex-1 p-4 md:p-8 pb-[var(--dock-safe-pb)] md:pb-8 overflow-auto">{children}</main>
      </div>
      <MobileBottomNav />
    </div>
  );
};

export default AdminLayout;
