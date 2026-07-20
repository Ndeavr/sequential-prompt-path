/**
 * UNPRO — Admin Navigation Config (v2, revenue-focused)
 * 7 sections. Every link points to an existing route in src/app/router.tsx.
 * Labs is hidden by default; toggle via localStorage("admin.nav.showLabs").
 *
 * Rules:
 *  - Never add a link here without a matching Route in router.tsx.
 *  - Keep top sections to ≤6 items each. Everything else goes to Labs.
 *  - Audit: `docs/admin-links-audit.md`.
 */
import {
  LayoutDashboard, DollarSign, CalendarDays, Briefcase, Users,
  SearchCheck, ShieldCheck, Shield, TrendingUp, Mail, Smartphone,
  Activity, Sparkles, Brain, Cpu, Bell, Heart, ScrollText, Settings,
  Ban, TestTube, Rocket, BarChart3, Wand2, Bot, FileText, Star,
  Tag, MapPin, Grid3X3, Network, Zap, Camera, ImageIcon, Send,
  Inbox, Server, Target, Palette, FolderOpen, LayoutList, AlertTriangle,
  Upload, HandCoins, UserCheck, Handshake, Radio, Gauge, Clock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavLeaf { to: string; label: string; icon: LucideIcon }
export interface NavGroup { key: string; label: string; icon: LucideIcon; items: NavLeaf[]; defaultHidden?: boolean }

export const adminNavGroups: NavGroup[] = [
  {
    key: "business", label: "Business", icon: LayoutDashboard,
    items: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { to: "/admin/launch-war-room", label: "Launch War Room", icon: Rocket },
      { to: "/admin/pricing", label: "Revenue", icon: DollarSign },
      { to: "/admin/appointments", label: "Appointments", icon: CalendarDays },
      { to: "/admin/first-dollar", label: "First Dollar", icon: HandCoins },
    ],
  },
  {
    key: "affiliates", label: "Affiliates", icon: Handshake,
    items: [
      { to: "/admin/affiliates", label: "War Room", icon: Radio },
      { to: "/admin/affiliates/assign", label: "Assign Prospects", icon: UserCheck },
      { to: "/admin/partenaires", label: "Partners", icon: Handshake },
      { to: "/admin/partner-applications", label: "Applications", icon: FileText },
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
      { to: "/admin/sniper", label: "Sniper", icon: Target },
      { to: "/admin/seo-health", label: "SEO Health", icon: Gauge },
    ],
  },
  {
    key: "alex", label: "Alex", icon: Sparkles,
    items: [
      { to: "/admin/agents", label: "AI Agents", icon: Brain },
      { to: "/admin/answer-engine", label: "Knowledge Base", icon: Cpu },
      { to: "/admin/alex-prompt-rules", label: "Prompt Rules", icon: FileText },
      { to: "/admin/alex/voice-lab", label: "Voice Lab", icon: Radio },
      { to: "/admin/voice-health", label: "Voice Health", icon: Heart },
    ],
  },
  {
    key: "system", label: "System", icon: Settings,
    items: [
      { to: "/admin/alerts", label: "Alerts", icon: Bell },
      { to: "/admin/operations", label: "Health", icon: Heart },
      { to: "/admin/system-integrity", label: "System Integrity", icon: ShieldCheck },
      { to: "/admin/onboarding-orchestrator", label: "Onboarding Orchestrator", icon: ShieldCheck },
      { to: "/admin/system-time", label: "Time Health", icon: Clock },
      { to: "/admin/ui-health", label: "UI Health", icon: Gauge },
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
      { to: "/admin/autonomous-engine", label: "Autonomous Engine", icon: Bot },
      { to: "/admin/concierge", label: "Concierge Cockpit", icon: Sparkles },
      { to: "/admin/predictive-leads", label: "Predictive Leads", icon: Brain },
      { to: "/admin/predictive-market-board", label: "Predictive Market", icon: Zap },
      { to: "/admin/home-graph", label: "Problem Graph", icon: Network },
      { to: "/admin/growth", label: "Growth", icon: BarChart3 },
      { to: "/admin/growth-engine", label: "Growth Engine", icon: TrendingUp },
      { to: "/admin/dynamic-pricing", label: "Dynamic Pricing", icon: TrendingUp },
      { to: "/admin/zone-value", label: "Zones & Exclusivity", icon: MapPin },
      { to: "/admin/capacity-framework", label: "Capacity Framework", icon: Grid3X3 },
      { to: "/admin/territories", label: "Territories", icon: MapPin },
      { to: "/admin/city-activity-matrix", label: "City×Activity Matrix", icon: Grid3X3 },
      { to: "/admin/services-secondaires", label: "Secondary Services", icon: Zap },
      { to: "/admin/screenshot-analytics", label: "Screenshot Intel", icon: Camera },
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
      { to: "/admin/acquisition-diagnostics", label: "Acquisition Diagnostics", icon: AlertTriangle },
      { to: "/admin/plans-matrix", label: "Plans Matrix", icon: Grid3X3 },
      { to: "/admin/aeo", label: "AEO Cockpit", icon: Sparkles },
      { to: "/admin/journal", label: "Journal", icon: FileText },
      { to: "/admin/ai-trust", label: "AI Trust", icon: Shield },
      { to: "/admin/ai-entities", label: "AI Entities", icon: Network },
      { to: "/admin/smart-context", label: "Smart Context", icon: Brain },
      { to: "/admin/lead-empire", label: "Lead Empire", icon: TrendingUp },
      { to: "/admin/founders", label: "Founders", icon: Star },
      { to: "/admin/founder-invites", label: "Founder Invites", icon: Mail },
      { to: "/admin/go-live", label: "Go-Live", icon: Rocket },
      { to: "/admin/qr-codes", label: "QR Codes", icon: Grid3X3 },
      { to: "/admin/critical-path-audit", label: "Critical Path Audit", icon: AlertTriangle },
      { to: "/admin/campaign-center", label: "Campaign Center", icon: Rocket },
      { to: "/admin/email-templates", label: "Email Templates", icon: Mail },
      { to: "/admin/menu-intelligence", label: "Menu Intelligence", icon: BarChart3 },
      { to: "/admin/handoff-analytics", label: "Handoff Analytics", icon: BarChart3 },
      { to: "/admin/pricing-intelligence", label: "Pricing Intelligence", icon: DollarSign },
    ],
  },
];
