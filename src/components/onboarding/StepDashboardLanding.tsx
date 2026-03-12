import { motion } from "framer-motion";
import { Award, TrendingUp, Shield, Star, Globe, Users, Zap, Settings, ChevronRight, Upload, Link, ArrowUpRight, Eye, BarChart3, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Props {
  businessName: string;
  aippScore: number;
}

const cards = [
  { icon: TrendingUp, label: "Profile Strength", value: "78%", action: "Improve", color: "text-primary", desc: "4 items to complete" },
  { icon: Globe, label: "Visibility Score", value: "12 found", action: "Explore", color: "text-accent", desc: "Opportunities detected" },
  { icon: Shield, label: "Trust Signals", value: "4 missing", action: "Complete", color: "text-warning", desc: "Add to boost conversions" },
  { icon: Star, label: "Review Score", value: "4.6/5", action: "Boost", color: "text-yellow-400", desc: "47 reviews indexed" },
  { icon: ArrowUpRight, label: "Website Quality", value: "6 actions", action: "Optimize", color: "text-secondary", desc: "Conversion improvements" },
  { icon: Users, label: "Lead Readiness", value: "Active", action: "Configure", color: "text-success", desc: "Ready to receive leads" },
];

const nextActions = [
  { icon: Shield, label: "Add your RBQ license", impact: "+8 AIPP", priority: true },
  { icon: Upload, label: "Upload portfolio photos", impact: "+5 AIPP", priority: true },
  { icon: Star, label: "Respond to 3 reviews", impact: "+4 AIPP", priority: false },
  { icon: Globe, label: "Add city-service pages", impact: "+6 AIPP", priority: false },
];

const quickActions = [
  { icon: Settings, label: "Complete profile" },
  { icon: Upload, label: "Upload media" },
  { icon: Link, label: "Connect Google" },
  { icon: Link, label: "Connect Facebook" },
  { icon: Zap, label: "Launch plan" },
];

export default function StepDashboardLanding({ businessName, aippScore }: Props) {
  const navigate = useNavigate();

  return (
    <div className="dark min-h-screen px-4 py-8">
      <div className="w-full max-w-lg mx-auto space-y-5">
        {/* Hero card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border/40 bg-gradient-to-br from-card/80 via-card/60 to-primary/[0.04] backdrop-blur-xl p-5 space-y-4 shadow-[var(--shadow-lg)]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-xl shadow-[var(--shadow-glow)]">
              {businessName.charAt(0)}
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-foreground">{businessName}</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                Profile activated • Ready to grow
              </p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2.5">
              <Award className="w-5 h-5 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{aippScore}</p>
                <p className="text-[10px] text-muted-foreground">AIPP Score</p>
              </div>
            </div>
            <div className="h-10 w-px bg-border/30" />
            <div>
              <p className="text-2xl font-bold text-foreground">78%</p>
              <p className="text-[10px] text-muted-foreground">Complete</p>
            </div>
            <div className="flex-1" />
            <Button size="sm" className="bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 text-xs rounded-xl h-9 gap-1 font-semibold">
              Next Action <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </motion.div>

        {/* Recommended next actions — high priority */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-xl border border-primary/20 bg-primary/[0.03] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">Recommended Next Steps</span>
          </div>
          <div className="space-y-1.5">
            {nextActions.map((action, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.06 }}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/10 transition-all group text-left"
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${action.priority ? "bg-primary/15" : "bg-muted/15"}`}>
                  <action.icon className={`w-3.5 h-3.5 ${action.priority ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <span className="text-sm text-foreground flex-1 group-hover:text-primary transition-colors">{action.label}</span>
                <span className="text-[10px] text-success font-semibold">{action.impact}</span>
                <ChevronRight className="w-3 h-3 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Dashboard cards */}
        <div className="grid grid-cols-2 gap-2">
          {cards.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className="rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm p-3.5 space-y-2 hover:border-border/50 hover:bg-card/40 transition-all cursor-pointer group"
            >
              <card.icon className={`w-5 h-5 ${card.color} group-hover:scale-110 transition-transform`} />
              <p className="text-[11px] text-muted-foreground/60">{card.label}</p>
              <p className="text-sm font-bold text-foreground">{card.value}</p>
              <p className="text-[10px] text-muted-foreground/40">{card.desc}</p>
              <button className="text-[10px] text-primary font-semibold hover:underline flex items-center gap-0.5 group-hover:gap-1 transition-all">
                {card.action} <ChevronRight className="w-2.5 h-2.5" />
              </button>
            </motion.div>
          ))}
        </div>

        {/* Quick actions */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm p-4 space-y-3">
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">Quick Actions</p>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action, i) => (
              <button key={i} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted/10 border border-border/20 text-xs text-foreground hover:bg-muted/20 hover:border-border/40 transition-all">
                <action.icon className="w-3.5 h-3.5 text-muted-foreground/60" />
                {action.label}
              </button>
            ))}
          </div>
        </motion.div>

        <Button onClick={() => navigate("/pro")}
          className="w-full h-13 text-base font-bold bg-gradient-to-r from-primary via-primary to-secondary hover:shadow-[var(--shadow-glow-lg)] hover:brightness-110 transition-all duration-300 border-0 rounded-xl gap-2 group">
          Go to Full Dashboard
          <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </Button>
      </div>
    </div>
  );
}
