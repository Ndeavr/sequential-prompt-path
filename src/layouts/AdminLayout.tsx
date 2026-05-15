/**
 * UNPRO — Admin Layout (Grouped Navigation + Search)
 */
import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LayoutDashboard, Users, Briefcase, FileText, Star, FolderOpen,
  CalendarDays, TrendingUp, LogOut, MapPin, BarChart3, Sparkles,
  Brain, Palette, Menu, X, ShieldCheck, Shield, Bell, SearchCheck,
  Bot, Network, Camera, Wand2, Zap, Tag, Rocket, Grid3X3,
  ChevronDown, ChevronRight, Mail, Send, Activity, Settings,
  ScrollText, Inbox, Heart, DollarSign, Smartphone, Ban, LayoutList,
  Server, Cpu, Target, ImageIcon, TestTube, Search,
} from "lucide-react";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";
import BannerSystemEnvironmentStatus from "@/components/admin/system/BannerSystemEnvironmentStatus";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface NavLeaf { to: string; label: string; icon: LucideIcon }
interface NavGroup { key: string; label: string; icon: LucideIcon; items: NavLeaf[] }

const navGroups: NavGroup[] = [
  {
    key: "cockpit", label: "Cockpit", icon: Sparkles,
    items: [
      { to: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
      { to: "/admin/omega", label: "Omega Cockpit", icon: Sparkles },
      { to: "/admin/operations", label: "Operations Hub", icon: Activity },
      { to: "/admin/alerts", label: "Alertes", icon: Bell },
    ],
  },
  {
    key: "people", label: "People", icon: Users,
    items: [
      { to: "/admin/users", label: "Utilisateurs", icon: Users },
      { to: "/admin/contractors", label: "Entrepreneurs", icon: Briefcase },
      { to: "/admin/verification", label: "Vérifications", icon: SearchCheck },
      { to: "/admin/validation", label: "Validation", icon: ShieldCheck },
      { to: "/admin/verified-contractors", label: "Entrepreneurs vérifiés", icon: Shield },
    ],
  },
  {
    key: "revenue", label: "Revenue", icon: DollarSign,
    items: [
      { to: "/admin/leads", label: "Leads", icon: TrendingUp },
      { to: "/admin/appointments", label: "Rendez-vous", icon: CalendarDays },
      { to: "/admin/quotes", label: "Soumissions", icon: FileText },
      { to: "/admin/reviews", label: "Avis", icon: Star },
      { to: "/admin/coupons", label: "Coupons", icon: Tag },
      { to: "/admin/pricing", label: "Pricing", icon: DollarSign },
    ],
  },
  {
    key: "intelligence", label: "Intelligence", icon: Brain,
    items: [
      { to: "/admin/agents", label: "Agents IA", icon: Brain },
      { to: "/admin/optimization", label: "Optimisation IA", icon: Wand2 },
      { to: "/admin/predictive-leads", label: "Predictive Leads", icon: Brain },
      { to: "/admin/predictive-market-board", label: "Centre Prédictif", icon: Zap },
      { to: "/admin/home-graph", label: "Problem Graph", icon: Network },
      { to: "/admin/answer", label: "Answer Engine", icon: Cpu },
    ],
  },
  {
    key: "growth", label: "Growth", icon: TrendingUp,
    items: [
      { to: "/admin/growth", label: "Croissance", icon: BarChart3 },
      { to: "/admin/growth-engine", label: "Growth Engine", icon: TrendingUp },
      { to: "/admin/dynamic-pricing-market", label: "Prix Dynamique", icon: TrendingUp },
      { to: "/admin/zone-value", label: "Zones & Exclusivité", icon: MapPin },
      { to: "/admin/capacity-framework", label: "Capacity Framework", icon: Grid3X3 },
      { to: "/admin/territories", label: "Territoires", icon: MapPin },
      { to: "/admin/city-activity-matrix", label: "Matrice Ville×Activité", icon: Grid3X3 },
      { to: "/admin/services-secondaires", label: "Services Quotidiens", icon: Zap },
      { to: "/admin/screenshot-analytics", label: "Screenshot Intel", icon: Camera },
      { to: "/admin/local-seo", label: "Local SEO", icon: SearchCheck },
    ],
  },
  {
    key: "outbound-city", label: "Outbound · City-First", icon: MapPin,
    items: [
      { to: "/admin/outbound/cities", label: "Villes cibles", icon: MapPin },
      { to: "/admin/outbound/diagnostics", label: "Diagnostics", icon: Activity },
    ],
  },
  {
    key: "outbound-auto", label: "Outbound · Autopilot", icon: Rocket,
    items: [
      { to: "/admin/outbound/targets", label: "Marchés Cibles", icon: Target },
      { to: "/admin/outbound/autopilot/runs", label: "Autopilot Runs", icon: Rocket },
    ],
  },
  {
    key: "outbound-core", label: "Outbound · Core", icon: Send,
    items: [
      { to: "/admin/outbound", label: "Dashboard", icon: LayoutDashboard },
      { to: "/admin/outbound/campaigns", label: "Campagnes", icon: Rocket },
      { to: "/admin/outbound/campaigns/new", label: "Nouvelle campagne", icon: Zap },
      { to: "/admin/outbound/leads", label: "Prospects", icon: Users },
      { to: "/admin/outbound/runs", label: "Pipeline Live", icon: Activity },
    ],
  },
  {
    key: "outbound-ops", label: "Outbound · Pipeline & Ops", icon: Activity,
    items: [
      { to: "/admin/outbound/ops", label: "Centre Ops", icon: Activity },
      { to: "/admin/outbound/verification", label: "Vérification", icon: ShieldCheck },
      { to: "/admin/outbound/tests", label: "Tests manuels", icon: TestTube },
      { to: "/admin/outbound/automations", label: "Automatisations", icon: Bot },
      { to: "/admin/outbound/logs", label: "Logs", icon: ScrollText },
    ],
  },
  {
    key: "outbound-email", label: "Outbound · Email", icon: Mail,
    items: [
      { to: "/admin/outbound/sequences", label: "Séquences", icon: Mail },
      { to: "/admin/outbound/sequences-elite", label: "Séquences AIPP", icon: Send },
      { to: "/admin/outbound/mailboxes", label: "Boîtes d'envoi", icon: Inbox },
      { to: "/admin/outbound/sending-architecture", label: "Architecture", icon: Server },
      { to: "/admin/outbound/email-health", label: "Santé Email", icon: Heart },
      { to: "/admin/outbound/deliverability", label: "Délivrabilité", icon: Activity },
    ],
  },
  {
    key: "outbound-intel", label: "Outbound · Intelligence", icon: Cpu,
    items: [
      { to: "/admin/outbound/ai-rewrite", label: "Personnalisation IA", icon: Cpu },
      { to: "/admin/outbound/revenue", label: "Revenue Loss", icon: DollarSign },
      { to: "/admin/outbound/sms-fallback", label: "SMS Fallback", icon: Smartphone },
      { to: "/admin/sms-images", label: "Images SMS", icon: ImageIcon },
      { to: "/admin/brand", label: "Brand Engine", icon: Shield },
      { to: "/admin/brand-intelligence/logos", label: "Brand Logos", icon: ImageIcon },
      { to: "/admin/outbound/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/admin/outbound/suppressions", label: "Suppressions", icon: Ban },
      { to: "/admin/outbound/settings", label: "Settings", icon: Settings },
      { to: "/admin/outbound/settings-lite", label: "Settings (legacy)", icon: LayoutList },
    ],
  },
  {
    key: "ops", label: "Ops", icon: Settings,
    items: [
      { to: "/admin/automation", label: "Automatisation", icon: Bot },
      { to: "/admin/documents", label: "Documents", icon: FolderOpen },
      { to: "/admin/media", label: "Média IA", icon: Palette },
      { to: "/admin/prospection-engine", label: "Prospection Engine", icon: Rocket },
      { to: "/admin/uos", label: "UNPRO OS", icon: Sparkles },
    ],
  },
];

const NavLink = ({ to, label, icon: Icon, pathname, onNavigate }: NavLeaf & { pathname: string; onNavigate?: () => void }) => {
  const active = pathname === to || (to !== "/admin" && to !== "/admin/outbound" && pathname.startsWith(to + "/"));
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 pl-7 text-[13px] font-medium transition ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {label}
    </Link>
  );
};

const NavGroupItem = ({ group, pathname, onNavigate, forceOpen }: {
  group: NavGroup; pathname: string; onNavigate?: () => void; forceOpen?: boolean;
}) => {
  const isOnGroup = group.items.some(i => pathname === i.to || (i.to !== "/admin" && pathname.startsWith(i.to + "/")));
  const [open, setOpen] = useState(isOnGroup);
  const expanded = forceOpen || open;

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-semibold transition ${
          isOnGroup ? "text-primary" : "text-foreground/80 hover:bg-muted/40"
        }`}
      >
        <group.icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">{group.label}</span>
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
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return navGroups;
    return navGroups
      .map(g => ({ ...g, items: g.items.filter(i => i.label.toLowerCase().includes(q)) }))
      .filter(g => g.items.length > 0);
  }, [q]);

  return (
    <div className="space-y-2">
      <div className="relative px-1 mb-2 sticky top-0 bg-card/80 backdrop-blur-sm pt-1 pb-2 z-10">
        <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Rechercher…"
          className="h-8 pl-8 text-xs rounded-lg bg-muted/30 border-border/40"
        />
      </div>
      {filtered.map(group => (
        <NavGroupItem key={group.key} group={group} pathname={pathname} onNavigate={onNavigate} forceOpen={!!q} />
      ))}
      {filtered.length === 0 && (
        <p className="text-xs text-muted-foreground px-3 py-4 text-center">Aucun résultat.</p>
      )}
    </div>
  );
};

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  const { signOut, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-background">
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
            <LogOut className="h-3.5 w-3.5" /> Déconnexion
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <BannerSystemEnvironmentStatus />
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
            <div className="md:hidden fixed top-[45px] left-0 right-0 bottom-0 z-40 bg-card border-b border-border/30 overflow-y-auto p-3">
              <Nav pathname={pathname} onNavigate={() => setMobileMenuOpen(false)} />
              <div className="border-t border-border/30 pt-3 mt-3 space-y-2">
                <p className="text-[11px] text-muted-foreground px-3 truncate">{user?.email}</p>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 rounded-lg text-xs h-8" onClick={signOut}>
                  <LogOut className="h-3.5 w-3.5" /> Déconnexion
                </Button>
              </div>
            </div>
          </>
        )}

        <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8 overflow-auto">{children}</main>
      </div>
      <MobileBottomNav />
    </div>
  );
};

export default AdminLayout;
