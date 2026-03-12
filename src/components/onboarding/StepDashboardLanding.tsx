import { motion } from "framer-motion";
import { Award, TrendingUp, Shield, Star, Globe, Users, Zap, Settings, ChevronRight, Upload, Link, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Props {
  businessName: string;
  aippScore: number;
}

const cards = [
  { icon: TrendingUp, label: "Profile Strength", value: "78%", action: "Improve", color: "text-primary" },
  { icon: Globe, label: "Visibility Opportunities", value: "12 found", action: "Explore", color: "text-accent" },
  { icon: Shield, label: "Missing Trust Items", value: "4 items", action: "Complete", color: "text-warning" },
  { icon: Star, label: "Review Performance", value: "4.6/5", action: "Boost", color: "text-yellow-400" },
  { icon: ArrowUpRight, label: "Website Improvements", value: "6 actions", action: "View", color: "text-secondary" },
  { icon: Users, label: "Lead Readiness", value: "Active", action: "Configure", color: "text-success" },
];

const quickActions = [
  { icon: Settings, label: "Complete profile" },
  { icon: Upload, label: "Upload media" },
  { icon: Link, label: "Connect Google" },
  { icon: Link, label: "Connect Facebook" },
  { icon: Zap, label: "Launch visibility plan" },
];

export default function StepDashboardLanding({ businessName, aippScore }: Props) {
  const navigate = useNavigate();

  return (
    <div className="dark min-h-screen px-4 py-8">
      <div className="w-full max-w-lg mx-auto space-y-6">
        {/* Hero card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-primary/5 p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-xl">
              {businessName.charAt(0)}
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-foreground">{businessName}</h1>
              <p className="text-xs text-muted-foreground">Profile activated • Ready to grow</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xl font-bold text-foreground">{aippScore}</p>
                <p className="text-[10px] text-muted-foreground">AIPP Score</p>
              </div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="text-xl font-bold text-foreground">78%</p>
              <p className="text-[10px] text-muted-foreground">Complete</p>
            </div>
            <div className="flex-1" />
            <Button size="sm" className="bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 text-xs rounded-lg h-8">
              Next Action <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </motion.div>

        {/* Dashboard cards */}
        <div className="grid grid-cols-2 gap-2.5">
          {cards.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.06 }}
              className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-3.5 space-y-2"
            >
              <card.icon className={`w-5 h-5 ${card.color}`} />
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="text-sm font-bold text-foreground">{card.value}</p>
              <button className="text-[10px] text-primary font-medium hover:underline">{card.action} →</button>
            </motion.div>
          ))}
        </div>

        {/* Quick actions */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Actions</p>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action, i) => (
              <button key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/30 border border-border/50 text-xs text-foreground hover:bg-muted/50 transition-colors">
                <action.icon className="w-3.5 h-3.5 text-muted-foreground" />
                {action.label}
              </button>
            ))}
          </div>
        </motion.div>

        <Button onClick={() => navigate("/pro")} className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 border-0 rounded-xl">
          Go to Full Dashboard
        </Button>
      </div>
    </div>
  );
}
