import { motion } from "framer-motion";
import { Check, AlertTriangle, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AuditSection } from "@/services/businessImportService";

const statusStyle: Record<string, { dot: string; text: string }> = {
  strong: { dot: "bg-success", text: "text-success" },
  needs_attention: { dot: "bg-warning", text: "text-warning" },
  weak: { dot: "bg-destructive", text: "text-destructive" },
  missing: { dot: "bg-muted-foreground", text: "text-muted-foreground" },
};

interface Props {
  sections: AuditSection[];
  onContinue: () => void;
}

export default function StepAuditResults({ sections, onContinue }: Props) {
  const strong = sections.filter(s => s.status === "strong").length;
  const weak = sections.filter(s => s.status === "weak" || s.status === "missing").length;

  return (
    <div className="dark min-h-screen px-4 py-12">
      <div className="w-full max-w-lg mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-foreground">Import Results</h2>
          <p className="text-sm text-muted-foreground">Here's what we found across your online presence.</p>
          <div className="flex justify-center gap-4 pt-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success"><span className="w-2 h-2 rounded-full bg-success" />{strong} strong</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-warning"><span className="w-2 h-2 rounded-full bg-warning" />{sections.length - strong - weak} attention</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-destructive"><span className="w-2 h-2 rounded-full bg-destructive" />{weak} weak/missing</span>
          </div>
        </motion.div>

        <div className="space-y-2.5">
          {sections.map((section, i) => {
            const st = statusStyle[section.status];
            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden"
              >
                <div className="flex items-center gap-3 p-4">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${st.dot}`} />
                  <span className="text-sm font-medium text-foreground flex-1">{section.label}</span>
                  <span className={`text-[10px] font-medium uppercase ${st.text}`}>{section.status.replace("_", " ")}</span>
                </div>
                <div className="px-4 pb-3 space-y-1.5">
                  {section.items.map((item, j) => (
                    <div key={j} className="flex items-center gap-2 text-xs">
                      <span className={`w-1.5 h-1.5 rounded-full ${statusStyle[item.status].dot}`} />
                      <span className="text-muted-foreground flex-1">{item.label}</span>
                      <span className={`${statusStyle[item.status].text}`}>{item.detail}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <Button onClick={onContinue} className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 border-0 rounded-xl gap-2">
            Continue <ChevronRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
