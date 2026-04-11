/**
 * PanelAlexInlineFormRenderer — Generic inline form rendered inside chat.
 * Supports prefilled fields, auto-save, inline submit.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { InlineFormData } from "./types";

interface Props {
  data: InlineFormData;
  onSubmit?: (values: Record<string, string>) => void;
}

export default function PanelAlexInlineFormRenderer({ data, onSubmit }: Props) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    data.fields.forEach(f => { init[f.key] = f.value || ""; });
    return init;
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    setSubmitted(true);
    onSubmit?.(values);
  };

  const filledCount = Object.values(values).filter(v => v.trim()).length;
  const total = data.fields.length;

  if (submitted) {
    return (
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="rounded-2xl border border-green-500/20 bg-green-500/5 p-4 text-center">
        <Check className="h-6 w-6 text-green-500 mx-auto mb-2" />
        <p className="text-sm font-medium text-foreground">Formulaire envoyé</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">{data.title}</h4>
        <span className="text-xs text-muted-foreground">{filledCount}/{total}</span>
      </div>

      <div className="space-y-2.5">
        {data.fields.map(field => (
          <div key={field.key} className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs text-muted-foreground">{field.label}</Label>
              {field.prefilled && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 gap-0.5">
                  <Sparkles className="h-2.5 w-2.5" /> Prérempli
                </Badge>
              )}
            </div>
            <Input
              value={values[field.key] || ""}
              onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
              placeholder={field.placeholder}
              className="h-9 text-sm bg-background/50"
            />
          </div>
        ))}
      </div>

      <Button onClick={handleSubmit} className="w-full h-9 text-sm" size="sm">
        {data.submitLabel || "Envoyer"}
      </Button>
    </motion.div>
  );
}
