import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, MapPin, Star, ArrowUpRight, Globe, Building2, Brain, Zap, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onSelect: (objective: string) => void;
}

const objectives = [
  { id: "calls", icon: Phone, label: "Get more calls this month", horizon: "2-4 weeks", best: "low maturity" },
  { id: "maps", icon: MapPin, label: "Improve Google Maps visibility", horizon: "1-3 months", best: "all levels" },
  { id: "reviews", icon: Star, label: "Get more reviews", horizon: "1-2 months", best: "low-medium" },
  { id: "conversions", icon: ArrowUpRight, label: "Increase website conversions", horizon: "2-4 weeks", best: "medium-high" },
  { id: "dominate", icon: Building2, label: "Dominate one city", horizon: "3-6 months", best: "medium-high" },
  { id: "expand", icon: Globe, label: "Expand to multiple cities", horizon: "3-6 months", best: "high maturity" },
  { id: "ai-authority", icon: Brain, label: "Build AI-search authority", horizon: "3-6 months", best: "high maturity" },
  { id: "complete", icon: Zap, label: "Complete premium profile fast", horizon: "1-2 weeks", best: "all levels" },
];

export default function StepObjective({ onSelect }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="dark min-h-screen px-4 py-12">
      <div className="w-full max-w-lg mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-foreground">Choose Your Objective</h2>
          <p className="text-sm text-muted-foreground">What matters most to your business right now?</p>
        </motion.div>

        <div className="grid grid-cols-1 gap-2.5">
          {objectives.map((obj, i) => (
            <motion.button
              key={obj.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelected(obj.id)}
              className={`w-full text-left rounded-xl border p-4 transition-all duration-200 ${
                selected === obj.id
                  ? "border-primary bg-primary/10 shadow-[var(--shadow-glow)]"
                  : "border-border/50 bg-card/60 hover:border-border hover:bg-card/80"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  selected === obj.id ? "bg-primary/20" : "bg-muted/50"
                }`}>
                  <obj.icon className={`w-5 h-5 ${selected === obj.id ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{obj.label}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">{obj.horizon}</span>
                    <span className="text-[10px] text-muted-foreground/60">Best for {obj.best}</span>
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        <Button
          onClick={() => selected && onSelect(selected)}
          disabled={!selected}
          className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 border-0 rounded-xl gap-2"
        >
          See recommended plan <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
