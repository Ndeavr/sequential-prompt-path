import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, MapPin, Star, ArrowUpRight, Globe, Building2, Brain, Zap, ChevronRight, Clock, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PremiumMagneticButton } from "@/components/ui/PremiumMagneticButton";

interface Props {
  onSelect: (objective: string) => void;
}

const objectives = [
  { id: "calls", icon: Phone, label: "Get more calls this month", desc: "Fast-track lead generation through optimized presence", horizon: "2-4 weeks", best: "New businesses", color: "text-success" },
  { id: "maps", icon: MapPin, label: "Improve Google Maps visibility", desc: "Dominate local search results in your area", horizon: "1-3 months", best: "All levels", color: "text-red-400" },
  { id: "reviews", icon: Star, label: "Get more reviews", desc: "Build social proof that converts visitors into leads", horizon: "1-2 months", best: "Growing", color: "text-yellow-400" },
  { id: "conversions", icon: ArrowUpRight, label: "Increase website conversions", desc: "Turn website visitors into paying customers", horizon: "2-4 weeks", best: "Established", color: "text-accent" },
  { id: "dominate", icon: Building2, label: "Dominate one city", desc: "Become the #1 choice in your primary market", horizon: "3-6 months", best: "Established", color: "text-primary" },
  { id: "expand", icon: Globe, label: "Expand to multiple cities", desc: "Scale your reach across new territories", horizon: "3-6 months", best: "High growth", color: "text-secondary" },
  { id: "ai-authority", icon: Brain, label: "Build AI-search authority", desc: "Get recommended by ChatGPT, Gemini, and AI assistants", horizon: "3-6 months", best: "Advanced", color: "text-purple-400" },
  { id: "complete", icon: Zap, label: "Complete premium profile fast", desc: "Get everything optimized and polished quickly", horizon: "1-2 weeks", best: "All levels", color: "text-amber-400" },
];

export default function StepObjective({ onSelect }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="dark min-h-screen px-4 py-10">
      <div className="w-full max-w-lg mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wide">
            <Target className="w-3.5 h-3.5" /> Step 6 of 10
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-foreground">
            What's your<br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">#1 priority?</span>
          </h2>
          <p className="text-sm text-muted-foreground">We'll tailor your plan around this objective.</p>
        </motion.div>

        <div className="grid grid-cols-1 gap-2">
          {objectives.map((obj, i) => (
            <motion.button
              key={obj.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.04 }}
              onClick={() => setSelected(obj.id)}
              whileTap={{ scale: 0.98 }}
              className={`w-full text-left rounded-xl border p-4 transition-all duration-300 group ${
                selected === obj.id
                  ? "border-primary/40 bg-primary/[0.06] shadow-[var(--shadow-glow)]"
                  : "border-border/30 bg-card/30 hover:border-border/60 hover:bg-card/50"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                  selected === obj.id ? "bg-primary/15" : "bg-muted/20 group-hover:bg-muted/30"
                }`}>
                  <obj.icon className={`w-5 h-5 ${selected === obj.id ? obj.color : "text-muted-foreground/60 group-hover:text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold transition-colors ${selected === obj.id ? "text-foreground" : "text-foreground/80"}`}>{obj.label}</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-0.5 leading-relaxed">{obj.desc}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/50">
                      <Clock className="w-2.5 h-2.5" /> {obj.horizon}
                    </span>
                    <span className="text-[10px] text-muted-foreground/40">Best for {obj.best}</span>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                  selected === obj.id ? "border-primary bg-primary" : "border-border/40"
                }`}>
                  {selected === obj.id && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        <Button
          onClick={() => selected && onSelect(selected)}
          disabled={!selected}
          className="w-full h-13 text-base font-semibold bg-gradient-to-r from-primary via-primary to-secondary hover:shadow-[var(--shadow-glow-lg)] hover:brightness-110 disabled:opacity-30 transition-all duration-300 border-0 rounded-xl gap-2 group"
        >
          See recommended plan
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </div>
  );
}
