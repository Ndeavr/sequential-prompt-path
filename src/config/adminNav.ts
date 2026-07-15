/**
 * UNPRO — Admin Navigation Config (v1 Simplified)
 * 6 top-level sections, max 3 clicks to any page.
 * Labs is hidden by default; toggle via localStorage("admin.nav.showLabs").
 */
import {
  LayoutDashboard, DollarSign, CalendarDays, Briefcase, Users,
  SearchCheck, ShieldCheck, Shield, TrendingUp, Mail, Smartphone,
  Activity, Sparkles, Brain, Cpu, Bell, Heart, ScrollText, Settings,
  Ban, TestTube, Rocket, BarChart3, Wand2, Bot, FileText, Star,
  Tag, MapPin, Grid3X3, Network, Zap, Camera, ImageIcon, Send,
  Inbox, Server, Target, Palette, FolderOpen, LayoutList, AlertTriangle, Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavLeaf { to: string; label: string; icon: LucideIcon }
export interface NavGroup { key: string; label: string; icon: LucideIcon; items: NavLeaf[]; defaultHidden?: boolean }

export const adminNavGroups: NavGroup[] = [
  {
    key: "business", label: "Business", icon: LayoutDashboard,
    items: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { to: "/admin/pricing", label: "Revenue", icon: DollarSign },
      { to: "/admin/appointments", label: "Appointments", icon: CalendarDays },
    ],
  },
  {
    key: "contractors", label: "Contractors", icon: Briefcase,
    items: [
      { to: "/admin/users", label: "Prospects", icon: Users },
      { to: "/admin/verification", label: "Qualification", icon: SearchCheck },
      { to: "/admin/validation", label: "Activation", icon: ShieldCheck },
      { to: "/admin/verified-contractors", label: "Active Members", icon: Shield },
      { to: "/admin/acquisition-pipeline", label: "Acquisition Health", icon: Activity },
      { to: "/admin/acquisition-diagnostics", label: "Diagnostics", icon: AlertTriangle },
      { to: "/admin/import-contractors", label: "Import", icon: Upload },
      { to: "/admin/contractors", label: "All Contractors", icon: Briefcase },
    ],
  },
  {
    key: "growth", label: "Growth", icon: TrendingUp,
    items: [
      { to: "/admin/outbound", label: "Campaigns", icon: Rocket },
      { to: "/admin/outbound/sequences", label: "Emails", icon: Mail },
      { to: "/admin/outbound/sms-fallback", label: "SMS", icon: Smartphone },
      { to: "/admin/outbound/ops", label: "Pipeline", icon: Activity },
    ],
  },
  {
    key: "alex", label: "Alex", icon: Sparkles,
    items: [
      { to: "/admin/agents", label: "AI Agents", icon: Brain },
      { to: "/admin/answer", label: "Knowledge Base", icon: Cpu },
    ],
  },
  {
    key: "system", label: "System", icon: Settings,
    items: [
      { to: "/admin/alerts", label: "Alerts", icon: Bell },
      { to: "/admin/operations", label: "Health", icon: Heart },
      { to: "/admin/outbound/logs", label: "Logs", icon: ScrollText },
      { to: "/admin/outbound/settings", label: "Settings", icon: Settings },
      { to: "/admin/automation", label: "Kill Switch", icon: Ban },
      { to: "/admin/nav-analytics", label: "Usage Analytics", icon: BarChart3 },
    ],
  },
  {
    key: "labs", label: "Labs", icon: TestTube, defaultHidden: true,
    items: [
      { to: "/admin/omega", label: "Omega Cockpit", icon: Sparkles },
      { to: "/admin/predictive-leads", label: "Predictive Leads", icon: Brain },
      { to: "/admin/predictive-market-board", label: "Predictive Market", icon: Zap },
      { to: "/admin/home-graph", label: "Problem Graph", icon: Network },
      { to: "/admin/growth", label: "Growth", icon: BarChart3 },
      { to: "/admin/growth-engine", label: "Growth Engine", icon: TrendingUp },
      { to: "/admin/dynamic-pricing-market", label: "Dynamic Pricing", icon: TrendingUp },
      { to: "/admin/zone-value", label: "Zones & Exclusivity", icon: MapPin },
      { to: "/admin/capacity-framework", label: "Capacity Framework", icon: Grid3X3 },
      { to: "/admin/territories", label: "Territories", icon: MapPin },
      { to: "/admin/city-activity-matrix", label: "City×Activity Matrix", icon: Grid3X3 },
      { to: "/admin/services-secondaires", label: "Secondary Services", icon: Zap },
      { to: "/admin/screenshot-analytics", label: "Screenshot Intel", icon: Camera },
      { to: "/admin/local-seo", label: "Local SEO", icon: SearchCheck },
      { to: "/admin/outbound/cities", label: "Outbound Cities", icon: MapPin },
      { to: "/admin/outbound/diagnostics", label: "Outbound Diagnostics", icon: Activity },
      { to: "/admin/outbound/targets", label: "Outbound Markets", icon: Target },
      { to: "/admin/outbound/autopilot/runs", label: "Outbound Autopilot", icon: Rocket },
      { to: "/admin/outbound/campaigns", label: "Outbound Campaigns", icon: Rocket },
      { to: "/admin/outbound/leads", label: "Outbound Prospects", icon: Users },
      { to: "/admin/outbound/runs", label: "Outbound Runs", icon: Activity },
      { to: "/admin/outbound/verification", label: "Outbound Verify", icon: ShieldCheck },
      { to: "/admin/outbound/tests", label: "Outbound Tests", icon: TestTube },
      { to: "/admin/outbound/automations", label: "Outbound Automations", icon: Bot },
      { to: "/admin/outbound/sequences-elite", label: "Elite Sequences", icon: Send },
      { to: "/admin/outbound/mailboxes", label: "Mailboxes", icon: Inbox },
      { to: "/admin/outbound/sending-architecture", label: "Architecture", icon: Server },
      { to: "/admin/outbound/email-health", label: "Email Health", icon: Heart },
      { to: "/admin/outbound/deliverability", label: "Deliverability", icon: Activity },
      { to: "/admin/outbound/ai-rewrite", label: "AI Personalization", icon: Cpu },
      { to: "/admin/outbound/revenue", label: "Revenue Loss", icon: DollarSign },
      { to: "/admin/outbound/suppressions", label: "Suppressions", icon: Ban },
      { to: "/admin/outbound/settings-lite", label: "Settings (legacy)", icon: LayoutList },
      { to: "/admin/sms-images", label: "SMS Images", icon: ImageIcon },
      { to: "/admin/brand", label: "Brand Engine", icon: Shield },
      { to: "/admin/brand-intelligence/logos", label: "Brand Logos", icon: ImageIcon },
      { to: "/admin/leads", label: "Leads", icon: TrendingUp },
      { to: "/admin/reviews", label: "Reviews", icon: Star },
      { to: "/admin/quotes", label: "Quotes", icon: FileText },
      { to: "/admin/coupons", label: "Coupons", icon: Tag },
      { to: "/admin/documents", label: "Documents", icon: FolderOpen },
      { to: "/admin/media", label: "AI Media", icon: Palette },
      { to: "/admin/prospection-engine", label: "Prospection Engine", icon: Rocket },
      { to: "/admin/uos", label: "UNPRO OS", icon: Sparkles },
      { to: "/admin/optimization", label: "Optimization", icon: Wand2 },
    ],
  },
];
