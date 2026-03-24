import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, Sparkles, ArrowRight, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import type { MissingField } from "@/services/profileCompletionService";

interface Props {
  fields: MissingField[];
  onFieldAction: (field: MissingField) => void;
  completedFields?: string[];
}

const PRIORITY_CONFIG = {
  critical: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", label: "Critique" },
  important: { icon: AlertCircle, color: "text-warning", bg: "bg-warning/10", label: "Important" },
  optimization: { icon: Sparkles, color: "text-primary", bg: "bg-primary/10", label: "Optimisation" },
};

export default function MissingDataChecklist({ fields, onFieldAction, completedFields = [] }: Props) {
  const grouped = {
    critical: fields.filter((f) => f.priority === "critical"),
    important: fields.filter((f) => f.priority === "important"),
    optimization: fields.filter((f) => f.priority === "optimization"),
  };

  return (
    <div className="space-y-4">
      {(["critical", "important", "optimization"] as const).map((priority) => {
        const items = grouped[priority];
        if (items.length === 0) return null;
        const config = PRIORITY_CONFIG[priority];
        const Icon = config.icon;

        return (
          <div key={priority}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`h-4 w-4 ${config.color}`} />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{config.label}</span>
              <Badge variant="outline" className="text-[10px] px-1.5">{items.length}</Badge>
            </div>
            <div className="space-y-2">
              {items.map((f, i) => {
                const isDone = completedFields.includes(f.field);
                return (
                  <motion.div
                    key={f.field}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className={`transition-all ${isDone ? "opacity-50 border-success/30" : "hover:shadow-sm"}`}>
                      <CardContent className="p-3 flex items-center gap-3">
                        {isDone ? (
                          <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                        ) : (
                          <div className={`w-2 h-2 rounded-full ${config.bg} ${config.color} flex-shrink-0`} />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                            {f.label}
                          </p>
                          <p className="text-xs text-muted-foreground">+{f.impact} pts</p>
                        </div>
                        {!isDone && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => onFieldAction(f)}>
                            Ajouter <ArrowRight className="ml-1 h-3 w-3" />
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
