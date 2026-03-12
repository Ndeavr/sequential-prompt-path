import { motion } from "framer-motion";
import { Check, AlertTriangle, X, ChevronRight, ChevronDown, Shield, Eye, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PremiumMagneticButton } from "@/components/ui/PremiumMagneticButton";
import { useState } from "react";
import type { AuditSection } from "@/services/businessImportService";

const statusStyle: Record<string, { dot: string; text: string; icon: any; label: string }> = {
  strong: { dot: "bg-success", text: "text-success", icon: Check, label: "Strong" },
  needs_attention: { dot: "bg-warning", text: "text-warning", icon: AlertTriangle, label: "Attention" },
  weak: { dot: "bg-destructive", text: "text-destructive", icon: X, label: "Weak" },
  missing: { dot: "bg-muted-foreground/40", text: "text-muted-foreground/60", icon: X, label: "Missing" },
};

interface Props {
  sections: AuditSection[];
  onContinue: () => void;
}

export default function StepAuditResults({ sections, onContinue }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const strong = sections.filter(s => s.status === "strong").length;
  const attention = sections.filter(s => s.status === "needs_attention").length;
  const weak = sections.filter(s => s.status === "weak" || s.status === "missing").length;

  return (
    <div className="dark min-h-screen px-4 py-10">
      <div className="w-full max-w-lg mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold uppercase tracking-wide">
            <Eye className="w-3.5 h-3.5" /> Audit Complete
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-foreground">
            Import Results
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Here's what we found across your online presence. We'll help you fix every gap.
          </p>
        </motion.div>

        {/* Summary pills */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="flex justify-center gap-3">
          {[
            { count: strong, label: "Strong", color: "text-success", bg: "bg-success/10", border: "border-success/20" },
            { count: attention, label: "Attention", color: "text-warning", bg: "bg-warning/10", border: "border-warning/20" },
            { count: weak, label: "Weak", color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20" },
          ].map((pill, i) => (
            <div key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${pill.border} ${pill.bg}`}>
              <span className={`text-lg font-bold ${pill.color}`}>{pill.count}</span>
              <span className={`text-[10px] font-medium ${pill.color}`}>{pill.label}</span>
            </div>
          ))}
        </motion.div>

        {/* Section cards */}
        <div className="space-y-2">
          {sections.map((section, i) => {
            const st = statusStyle[section.status];
            const Icon = st.icon;
            const isExpanded = expanded === section.id;
            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                className={`rounded-xl border overflow-hidden transition-all duration-300 ${
                  section.status === "strong"
                    ? "border-success/20 bg-success/[0.02]"
                    : section.status === "needs_attention"
                    ? "border-warning/20 bg-warning/[0.02]"
                    : "border-destructive/20 bg-destructive/[0.02]"
                }`}
              >
                <button
                  onClick={() => setExpanded(isExpanded ? null : section.id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-muted/5 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-lg ${st.dot.replace("bg-", "bg-")}/10 flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${st.text}`} />
                  </div>
                  <span className="text-sm font-semibold text-foreground flex-1 text-left">{section.label}</span>
                  <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${st.text} bg-current/10`}>
                    {st.label}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground/40 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                </button>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="px-4 pb-4 space-y-2"
                  >
                    {section.items.map((item, j) => {
                      const itemSt = statusStyle[item.status];
                      return (
                        <div key={j} className="flex items-center gap-2.5 py-1">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${itemSt.dot}`} />
                          <span className="text-xs text-muted-foreground flex-1">{item.label}</span>
                          <span className={`text-[11px] font-medium ${itemSt.text}`}>{item.detail}</span>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="space-y-3 pt-2">
          <Button onClick={onContinue} className="w-full h-13 text-base font-semibold bg-gradient-to-r from-primary via-primary to-secondary hover:shadow-[var(--shadow-glow-lg)] hover:brightness-110 transition-all duration-300 border-0 rounded-xl gap-2 group">
            <TrendingUp className="w-4 h-4" />
            Complete & Boost Score
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
          <p className="text-center text-[10px] text-muted-foreground/50">Fill missing info to significantly improve your AIPP score</p>
        </motion.div>
      </div>
    </div>
  );
}
