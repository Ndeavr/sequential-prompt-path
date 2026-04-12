/**
 * UNPRO — Admin Layout (Programmatic Navigation)
 */

import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Users, Briefcase, FileText, Star, FolderOpen,
  CalendarDays, TrendingUp, LogOut, MapPin, BarChart3, Sparkles,
  Brain, Palette, Menu, X, ShieldCheck, Shield, Bell, SearchCheck,
  Bot, Network, Camera, Wand2, Zap, Tag, Rocket, Grid3X3,
  ChevronDown, ChevronRight, Mail, Send, Activity, Settings,
  MessageSquare, TestTube, ScrollText, Inbox, Heart, DollarSign,
  Smartphone, Ban, LayoutList, Server, Cpu,
} from "lucide-react";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

const navItems = [
  { to: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/admin/users", label: "Utilisateurs", icon: Users },
  { to: "/admin/contractors", label: "Entrepreneurs", icon: Briefcase },
  { to: "/admin/territories", label: "Territoires", icon: MapPin },
  { to: "/admin/leads", label: "Leads", icon: TrendingUp },
  { to: "/admin/appointments", label: "Rendez-vous", icon: CalendarDays },
  { to: "/admin/quotes", label: "Soumissions", icon: FileText },
  { to: "/admin/reviews", label: "Avis", icon: Star },
  { to: "/admin/documents", label: "Documents", icon: FolderOpen },
  { to: "/admin/growth", label: "Croissance", icon: BarChart3 },
  { to: "/admin/agents", label: "Agents IA", icon: Brain },
  { to: "/admin/media", label: "Média IA", icon: Palette },
  { to: "/admin/validation", label: "Validation", icon: ShieldCheck },
  { to: "/admin/verification", label: "Vérifications", icon: SearchCheck },
  { to: "/admin/alerts", label: "Alertes", icon: Bell },
  { to: "/admin/verified-contractors", label: "Entrepreneurs vérifiés", icon: Shield },
  { to: "/admin/automation", label: "Automatisation", icon: Bot },
  { to: "/admin/home-graph", label: "Problem Graph", icon: Network },
  { to: "/admin/growth-engine", label: "Growth Engine", icon: TrendingUp },
  { to: "/admin/screenshot-analytics", label: "Screenshot Intel", icon: Camera },
  { to: "/admin/optimization", label: "Optimisation IA", icon: Wand2 },
  { to: "/admin/predictive-leads", label: "Predictive Leads", icon: Brain },
  { to: "/admin/dynamic-pricing-market", label: "Prix Dynamique", icon: TrendingUp },
  { to: "/admin/predictive-market-board", label: "Centre Prédictif", icon: Zap },
  { to: "/admin/zone-value", label: "Zones & Exclusivité", icon: MapPin },
  { to: "/admin/coupons", label: "Coupons", icon: Tag },
  { to: "/admin/prospection-engine", label: "Prospection Engine", icon: Rocket },
  { to: "/admin/city-activity-matrix", label: "Matrice Ville×Activité", icon: Grid3X3 },
  { to: "/admin/services-secondaires", label: "Services Quotidiens", icon: Zap },
  { to: "/admin/uos", label: "UNPRO OS", icon: Sparkles },
];

interface OutboundSubGroup {
  label: string;
  items: { to: string; label: string; icon: LucideIcon }[];
}

const outboundGroups: OutboundSubGroup[] = [
  {
    label: "Core",
    items: [
      { to: "/admin/outbound", label: "Dashboard", icon: LayoutDashboard },
      { to: "/admin/outbound/leads", label: "Prospects", icon: Users },
      { to: "/admin/outbound/campaigns", label: "Campagnes", icon: Rocket },
    ],
  },
  {
    label: "Pipeline & Ops",
    items: [
      { to: "/admin/outbound/ops", label: "Centre Ops", icon: Activity },
      { to: "/admin/outbound/verification", label: "Vérification", icon: ShieldCheck },
      { to: "/admin/outbound/tests", label: "Tests manuels", icon: TestTube },
      { to: "/admin/outbound/automations", label: "Automatisations", icon: Bot },
      { to: "/admin/outbound/logs", label: "Logs", icon: ScrollText },
    ],
  },
  {
    label: "Email Engine",
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
    label: "Intelligence",
    items: [
      { to: "/admin/outbound/ai-rewrite", label: "Personnalisation IA", icon: Cpu },
      { to: "/admin/outbound/revenue", label: "Revenue Loss", icon: DollarSign },
      { to: "/admin/outbound/sms-fallback", label: "SMS Fallback", icon: Smartphone },
      { to: "/admin/outbound/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/admin/outbound/suppressions", label: "Suppressions", icon: Ban },
      { to: "/admin/outbound/settings-lite", label: "Settings", icon: Settings },
    ],
  },
];

const NavLinkItem = ({ to, label, icon: Icon, pathname, onNavigate, indent = false }: {
  to: string; label: string; icon: LucideIcon; pathname: string; onNavigate?: () => void; indent?: boolean;
}) => {
  const active = pathname === to || (to !== "/admin" && to !== "/admin/outbound" && pathname.startsWith(to));
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-meta font-medium transition-all duration-200 ${
        indent ? "pl-7 text-[13px]" : ""
      } ${
        active
          ? "bg-primary text-primary-foreground shadow-soft"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
};

const OutboundNavGroup = ({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) => {
  const isOnOutbound = pathname.startsWith("/admin/outbound");
  const [open, setOpen] = useState(isOnOutbound);

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-meta font-semibold transition-all duration-200 ${
          isOnOutbound && !open
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        }`}
      >
        <Send className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">Outbound</span>
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div className="mt-1 space-y-2">
          {outboundGroups.map((group) => (
            <div key={group.label}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-3 py-1 pl-7">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLinkItem key={item.to} {...item} pathname={pathname} onNavigate={onNavigate} indent />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const NavLinks = ({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) => (
  <>
    {navItems.map(({ to, label, icon: Icon }) => {
      const active = pathname === to || (to !== "/admin" && pathname.startsWith(to + "/"));
      const exactActive = pathname === to;
      return (
        <Link
          key={to}
          to={to}
          onClick={onNavigate}
          className={`flex items-center gap-3 rounded-xl px-3 py-2 text-meta font-medium transition-all duration-200 ${
            active || exactActive
              ? "bg-primary text-primary-foreground shadow-soft"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          }`}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Link>
      );
    })}
    <OutboundNavGroup pathname={pathname} onNavigate={onNavigate} />
  </>
);

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  const { signOut, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-60 flex-col border-r border-border/30 bg-card/40 p-4">
        <Link to="/" className="flex items-center gap-2 px-3 mb-1 mt-2">
          <div className="h-6 w-6 rounded-md bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Sparkles className="h-3 w-3 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold text-foreground">UNPRO</span>
        </Link>
        <span className="text-caption text-muted-foreground px-3 mb-6">Administration</span>

        <nav className="flex-1 space-y-0.5 overflow-y-auto">
          <NavLinks pathname={pathname} />
        </nav>

        <div className="border-t border-border/30 pt-3 mt-3 space-y-2">
          <p className="text-caption text-muted-foreground px-3 truncate">{user?.email}</p>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 rounded-xl text-meta h-9" onClick={signOut}>
            <LogOut className="h-3.5 w-3.5" /> Déconnexion
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between border-b border-border/30 px-4 py-2.5 bg-background/80 backdrop-blur-xl sticky top-0 z-30">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Sparkles className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="text-meta font-bold text-foreground">UNPRO Admin</span>
          </Link>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setMobileMenuOpen((v) => !v)}>
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </header>

        {mobileMenuOpen && (
          <>
            <div className="md:hidden fixed inset-0 bg-black/50 z-30 top-[45px]" onClick={() => setMobileMenuOpen(false)} />
            <div className="md:hidden fixed top-[45px] left-0 right-0 bottom-0 z-40 bg-card border-b border-border/30 overflow-y-auto p-4 space-y-1">
              <NavLinks pathname={pathname} onNavigate={() => setMobileMenuOpen(false)} />
              <div className="border-t border-border/30 pt-3 mt-3 space-y-2">
                <p className="text-caption text-muted-foreground px-3 truncate">{user?.email}</p>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 rounded-xl text-meta h-9" onClick={signOut}>
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
