import { Link } from "react-router-dom";
import ContractorLayout from "@/layouts/ContractorLayout";
import { LoadingState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useContractorProfile, useContractorReviews } from "@/hooks/useContractor";
import { useContractorLeads } from "@/hooks/useLeads";
import { useAppointments } from "@/hooks/useAppointments";
import { motion } from "framer-motion";
import {
  Star, ArrowRight, TrendingUp, MapPin, CalendarDays, Sparkles, Eye,
  Shield, Zap, Target, Crown, ChevronRight, Check, AlertTriangle,
  Globe, Upload, Link as LinkIcon, Brain, BarChart3, Users,
  Phone, ArrowUpRight, Award, FileText, Camera, MessageSquare
} from "lucide-react";

const f = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
});

const ProDashboard = () => {
  const { data: profile, isLoading: pLoading } = useContractorProfile();
  const { data: reviews, isLoading: rLoading } = useContractorReviews();
  const { data: leads, isLoading: lLoading } = useContractorLeads();
  const { data: appointments, isLoading: apLoading } = useAppointments();

  const isLoading = pLoading || rLoading || lLoading || apLoading;
  if (isLoading) return <ContractorLayout><LoadingState /></ContractorLayout>;

  const fields = [profile?.business_name, profile?.specialty, profile?.description, profile?.phone, profile?.email, profile?.city, profile?.license_number, profile?.insurance_info, profile?.logo_url, profile?.website];
  const completeness = fields.filter(Boolean).length;
  const completenessPercent = Math.round((completeness / fields.length) * 100);
  const aippScore = profile?.aipp_score ?? 42;
  const avgRating = profile?.rating ?? 4.6;
  const reviewCount = reviews?.length ?? 0;
  const newLeads = (leads ?? []).length;
  const upcomingAppts = (appointments ?? []).filter(a => a.status === "scheduled" || a.status === "accepted").length;
  const tier = aippScore >= 80 ? "Elite" : aippScore >= 60 ? "Gold" : aippScore >= 40 ? "Silver" : "Bronze";
  const tierGradient = tier === "Elite" ? "from-primary to-accent" : tier === "Gold" ? "from-yellow-500 to-amber-400" : tier === "Silver" ? "from-slate-400 to-slate-300" : "from-amber-700 to-amber-500";

  // Pillar scores (mock based on completeness)
  const pillars = [
    { label: "Identity", score: completenessPercent, max: 20, pct: Math.min(100, completenessPercent * 1.2) },
    { label: "Trust", score: Math.round(aippScore * 0.2), max: 20, pct: profile?.verification_status === "verified" ? 85 : 35 },
    { label: "Visibility", score: Math.round(aippScore * 0.18), max: 20, pct: 40 },
    { label: "Conversion", score: Math.round(aippScore * 0.22), max: 20, pct: 50 },
    { label: "AI / SEO", score: Math.round(aippScore * 0.15), max: 20, pct: 25 },
  ];

  const weaknesses = [
    !profile?.license_number && { icon: Shield, label: "Missing RBQ license", impact: "+8 AIPP", priority: "high" },
    !profile?.insurance_info && { icon: Shield, label: "No insurance info", impact: "+6 AIPP", priority: "high" },
    !profile?.logo_url && { icon: Camera, label: "No logo uploaded", impact: "+4 AIPP", priority: "medium" },
    !profile?.website && { icon: Globe, label: "No website linked", impact: "+5 AIPP", priority: "medium" },
    !profile?.description && { icon: FileText, label: "Missing description", impact: "+3 AIPP", priority: "medium" },
    reviewCount < 5 && { icon: Star, label: `Only ${reviewCount} reviews`, impact: "+4 AIPP", priority: "medium" },
  ].filter(Boolean) as { icon: any; label: string; impact: string; priority: string }[];

  const opportunities = [
    { icon: MapPin, label: "Add city-service pages", desc: "Dominate local search", impact: "+6 AIPP" },
    { icon: Star, label: "Respond to reviews", desc: "Boost trust signals", impact: "+4 AIPP" },
    { icon: Brain, label: "Add FAQ content", desc: "AI search readiness", impact: "+5 AIPP" },
    { icon: Globe, label: "Improve website CTA", desc: "Convert more visitors", impact: "+3 AIPP" },
    { icon: Camera, label: "Upload before/after photos", desc: "Build visual proof", impact: "+4 AIPP" },
    { icon: BarChart3, label: "Add structured data", desc: "Machine-readable profile", impact: "+5 AIPP" },
  ];

  const trustChecklist = [
    { label: "Business name verified", done: !!profile?.business_name },
    { label: "Phone number listed", done: !!profile?.phone },
    { label: "Email confirmed", done: !!profile?.email },
    { label: "RBQ / License", done: !!profile?.license_number },
    { label: "Insurance info", done: !!profile?.insurance_info },
    { label: "Profile verified", done: profile?.verification_status === "verified" },
    { label: "Logo uploaded", done: !!profile?.logo_url },
    { label: "Portfolio photos", done: (profile?.portfolio_urls?.length ?? 0) > 0 },
  ];
  const trustDone = trustChecklist.filter(t => t.done).length;

  const visibilityRoadmap = [
    { label: "Complete profile", done: completenessPercent >= 80, current: completenessPercent < 80 },
    { label: "Get verified", done: profile?.verification_status === "verified", current: completenessPercent >= 80 && profile?.verification_status !== "verified" },
    { label: "First 5 reviews", done: reviewCount >= 5, current: profile?.verification_status === "verified" && reviewCount < 5 },
    { label: "City-service pages", done: false, current: false },
    { label: "AI / SEO content", done: false, current: false },
    { label: "Category authority", done: false, current: false },
  ];

  return (
    <ContractorLayout>
      <div className="dark max-w-3xl mx-auto space-y-5 pb-20">
        {/* ═══ HERO — Business Identity ═══ */}
        <motion.div {...f(0)} className="rounded-2xl border border-border/40 bg-gradient-to-br from-card/80 via-card/60 to-primary/[0.04] backdrop-blur-xl p-5 shadow-[var(--shadow-lg)]">
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${tierGradient} flex items-center justify-center text-white font-bold text-2xl shadow-[var(--shadow-glow)] flex-shrink-0`}>
              {profile?.business_name?.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-foreground truncate">{profile?.business_name || "Your Business"}</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                {profile?.verification_status === "verified" ? (
                  <><span className="w-1.5 h-1.5 rounded-full bg-success" /> Verified professional</>
                ) : (
                  <><span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" /> Verification pending</>
                )}
                {profile?.city && <><span className="text-muted-foreground/30 mx-1">·</span><MapPin className="w-3 h-3" />{profile.city}</>}
              </p>
            </div>
            <Link to="/pro/profile">
              <Button size="sm" className="bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 text-xs rounded-xl h-9 font-semibold">
                Edit
              </Button>
            </Link>
          </div>

          {/* Score + Completion + Plan row */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="relative w-14 h-14">
                <svg viewBox="0 0 56 56" className="w-14 h-14 -rotate-90">
                  <circle cx="28" cy="28" r="23" fill="none" stroke="hsl(var(--muted)/0.3)" strokeWidth="4" />
                  <circle cx="28" cy="28" r="23" fill="none" stroke="url(#dashAipp)" strokeWidth="4"
                    strokeDasharray={2 * Math.PI * 23} strokeDashoffset={2 * Math.PI * 23 * (1 - aippScore / 100)}
                    strokeLinecap="round" />
                  <defs>
                    <linearGradient id="dashAipp" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" />
                      <stop offset="100%" stopColor="hsl(var(--accent))" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-foreground">{aippScore}</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">AIPP Score</p>
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r ${tierGradient} text-white text-[9px] font-bold uppercase tracking-wider`}>
                  <Crown className="w-2.5 h-2.5" /> {tier}
                </div>
              </div>
            </div>
            <div className="h-10 w-px bg-border/30" />
            <div>
              <p className="text-xl font-bold text-foreground">{completenessPercent}%</p>
              <p className="text-[10px] text-muted-foreground">Complete</p>
            </div>
            <div className="h-10 w-px bg-border/30" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-foreground">Growth Plan</p>
              <p className="text-[10px] text-muted-foreground">Starter · Active</p>
            </div>
          </div>
        </motion.div>

        {/* ═══ STAT CARDS ROW ═══ */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: Target, label: "Leads", value: String(newLeads), color: "text-primary" },
            { icon: Star, label: "Rating", value: avgRating > 0 ? `${avgRating.toFixed(1)}★` : "—", color: "text-yellow-400" },
            { icon: CalendarDays, label: "Appts", value: String(upcomingAppts), color: "text-accent" },
            { icon: Eye, label: "Views", value: "—", color: "text-secondary" },
          ].map((s, i) => (
            <motion.div key={s.label} {...f(i + 1)} className="rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm p-3 text-center hover:border-border/50 hover:bg-card/40 transition-all cursor-pointer">
              <s.icon className={`w-4 h-4 mx-auto ${s.color} mb-1.5`} />
              <p className="text-base font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* ═══ AIPP PILLAR BREAKDOWN ═══ */}
        <motion.div {...f(5)} className="rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">AIPP Breakdown</span>
            </div>
            <Link to="/pro/aipp-score" className="text-[10px] text-primary font-semibold hover:underline flex items-center gap-0.5">
              Full analysis <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {pillars.map((p, i) => (
            <div key={p.label} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">{p.label}</span>
                <span className="text-[11px] font-bold text-foreground">{p.score}/{p.max}</span>
              </div>
              <div className="h-[3px] rounded-full bg-muted/20 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                  initial={{ width: 0 }} animate={{ width: `${p.pct}%` }}
                  transition={{ delay: 0.4 + i * 0.08, duration: 0.6, ease: "easeOut" }}
                />
              </div>
            </div>
          ))}
        </motion.div>

        {/* ═══ TOP WEAKNESSES ═══ */}
        {weaknesses.length > 0 && (
          <motion.div {...f(6)} className="rounded-xl border border-destructive/20 bg-destructive/[0.03] p-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">Top Weaknesses</span>
              <span className="text-[10px] text-destructive font-semibold ml-auto">{weaknesses.length} issues</span>
            </div>
            {weaknesses.slice(0, 4).map((w, i) => (
              <Link key={i} to="/pro/profile" className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-destructive/[0.04] transition-all group">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${w.priority === "high" ? "bg-destructive/15" : "bg-warning/15"}`}>
                  <w.icon className={`w-3.5 h-3.5 ${w.priority === "high" ? "text-destructive" : "text-warning"}`} />
                </div>
                <span className="text-sm text-foreground flex-1">{w.label}</span>
                <span className="text-[10px] text-success font-semibold">{w.impact}</span>
                <ChevronRight className="w-3 h-3 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))}
          </motion.div>
        )}

        {/* ═══ TOP OPPORTUNITIES ═══ */}
        <motion.div {...f(7)} className="rounded-xl border border-primary/20 bg-primary/[0.03] p-4 space-y-2.5">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">Top Opportunities</span>
          </div>
          {opportunities.slice(0, 4).map((o, i) => (
            <button key={i} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-primary/[0.04] transition-all group text-left">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <o.icon className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm text-foreground">{o.label}</span>
                <p className="text-[10px] text-muted-foreground/60">{o.desc}</p>
              </div>
              <span className="text-[10px] text-success font-semibold">{o.impact}</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </button>
          ))}
        </motion.div>

        {/* ═══ VISIBILITY ROADMAP ═══ */}
        <motion.div {...f(8)} className="rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-accent" />
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">Visibility Roadmap</span>
          </div>
          <div className="relative pl-4">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border/30" />
            {visibilityRoadmap.map((step, i) => (
              <div key={i} className="flex items-center gap-3 py-2 relative">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 z-10 ${
                  step.done ? "bg-success border-success" : step.current ? "border-primary bg-primary/20" : "border-border/40 bg-card"
                }`}>
                  {step.done && <Check className="w-2.5 h-2.5 text-success-foreground" />}
                  {step.current && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                </div>
                <span className={`text-sm ${step.done ? "text-success/80 line-through" : step.current ? "text-foreground font-medium" : "text-muted-foreground/40"}`}>
                  {step.label}
                </span>
                {step.current && <span className="text-[9px] text-primary font-semibold uppercase tracking-wider ml-auto">Current</span>}
              </div>
            ))}
          </div>
        </motion.div>

        {/* ═══ TRUST CHECKLIST ═══ */}
        <motion.div {...f(9)} className="rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-success" />
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">Trust Checklist</span>
            </div>
            <span className="text-[10px] text-muted-foreground">{trustDone}/{trustChecklist.length} complete</span>
          </div>
          <div className="h-[3px] rounded-full bg-muted/20 overflow-hidden">
            <motion.div className="h-full rounded-full bg-success" initial={{ width: 0 }}
              animate={{ width: `${(trustDone / trustChecklist.length) * 100}%` }}
              transition={{ delay: 0.6, duration: 0.6 }} />
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {trustChecklist.map((item, i) => (
              <div key={i} className="flex items-center gap-2 py-1">
                <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${item.done ? "bg-success/20" : "bg-muted/20"}`}>
                  {item.done ? <Check className="w-2.5 h-2.5 text-success" /> : <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />}
                </div>
                <span className={`text-[11px] ${item.done ? "text-muted-foreground/70" : "text-foreground"}`}>{item.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ═══ REVIEW INSIGHTS ═══ */}
        <motion.div {...f(10)} className="rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-yellow-400" />
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">Review Insights</span>
            </div>
            <Link to="/pro/reviews" className="text-[10px] text-primary font-semibold hover:underline flex items-center gap-0.5">
              All reviews <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-muted/10 border border-border/20 p-3 text-center">
              <p className="text-lg font-bold text-foreground">{avgRating > 0 ? avgRating.toFixed(1) : "—"}</p>
              <div className="flex justify-center gap-0.5 my-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className={`w-3 h-3 ${s <= Math.round(avgRating) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/20"}`} />
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">Average</p>
            </div>
            <div className="rounded-lg bg-muted/10 border border-border/20 p-3 text-center">
              <p className="text-lg font-bold text-foreground">{reviewCount}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Total reviews</p>
            </div>
            <div className="rounded-lg bg-muted/10 border border-border/20 p-3 text-center">
              <p className="text-lg font-bold text-foreground">0%</p>
              <p className="text-[10px] text-muted-foreground mt-1">Response rate</p>
            </div>
          </div>
          {reviewCount < 10 && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-warning/[0.06] border border-warning/15">
              <AlertTriangle className="w-3.5 h-3.5 text-warning flex-shrink-0" />
              <p className="text-[11px] text-muted-foreground">
                <span className="text-foreground font-medium">Goal: 10+ reviews.</span> Ask satisfied clients to leave a review after each project.
              </p>
            </div>
          )}
        </motion.div>

        {/* ═══ PROFILE IMPROVEMENT ACTIONS ═══ */}
        <motion.div {...f(11)} className="rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">Quick Actions</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: Upload, label: "Upload logo", to: "/pro/profile" },
              { icon: Camera, label: "Add photos", to: "/pro/documents" },
              { icon: LinkIcon, label: "Connect Google", to: "/pro/profile" },
              { icon: MapPin, label: "Set territories", to: "/pro/territories" },
              { icon: FileText, label: "Add description", to: "/pro/profile" },
              { icon: Shield, label: "Get verified", to: "/pro/account" },
            ].map((action, i) => (
              <Link key={i} to={action.to}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/[0.05] border border-border/20 hover:bg-muted/10 hover:border-border/40 transition-all group">
                <action.icon className="w-4 h-4 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                <span className="text-xs text-foreground">{action.label}</span>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* ═══ UPGRADE PROMPT ═══ */}
        <motion.div {...f(12)} className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-card/40 to-secondary/[0.04] backdrop-blur-xl p-5 space-y-3 shadow-[var(--shadow-glow)]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0 shadow-md">
              <ArrowUpRight className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">Unlock Growth Plan</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                Upgrade to accelerate your visibility. Get city-service pages, conversion optimization, and stronger local signals.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
              <Award className="w-3 h-3" /> Target: {Math.min(100, aippScore + 25)} AIPP
            </div>
            <div className="flex-1" />
            <Link to="/pro/billing">
              <Button size="sm" className="bg-gradient-to-r from-primary to-secondary text-white border-0 rounded-xl h-9 text-xs font-bold hover:brightness-110 hover:shadow-[var(--shadow-glow)] transition-all gap-1.5">
                <Sparkles className="w-3 h-3" /> Upgrade Plan
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* ═══ OBJECTIVE PROGRESS ═══ */}
        <motion.div {...f(13)} className="rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-secondary" />
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">Objective Progress</span>
          </div>
          <div className="rounded-lg bg-muted/10 border border-border/20 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Get more calls this month</span>
              <span className="text-[10px] text-primary font-semibold">35%</span>
            </div>
            <div className="h-[3px] rounded-full bg-muted/20 overflow-hidden">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                initial={{ width: 0 }} animate={{ width: "35%" }} transition={{ delay: 0.8, duration: 0.6 }} />
            </div>
            <p className="text-[10px] text-muted-foreground">3 of 8 recommended actions completed</p>
          </div>
        </motion.div>

        {/* ═══ PLAN STATUS ═══ */}
        <motion.div {...f(14)} className="rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-accent" />
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">Plan Status</span>
            </div>
            <Link to="/pro/billing" className="text-[10px] text-primary font-semibold hover:underline flex items-center gap-0.5">
              Manage <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Starter</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success font-semibold">Active</span>
            <span className="text-[10px] text-muted-foreground ml-auto">$49/mo</span>
          </div>
        </motion.div>
      </div>
    </ContractorLayout>
  );
};

export default ProDashboard;
