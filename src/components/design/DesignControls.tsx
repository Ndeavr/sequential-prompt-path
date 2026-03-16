/**
 * UNPRO Design — Right Panel Controls
 * Prompt bar, style presets, materials, budget, actions
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Send, Mic, Sparkles, Paintbrush, Layers, DollarSign,
  Wand2, X, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  STYLE_PRESETS, BUDGET_FILTERS, SLIDERS, EDITABLE_ZONES, ZONE_LABELS,
} from "./data";

interface Props {
  onSendPrompt: (prompt: string, options?: {
    style?: string;
    budget?: string;
    zones?: string[];
    sliders?: Record<string, number>;
  }) => void;
  isGenerating: boolean;
  roomType: string | null;
}

export default function DesignControls({ onSendPrompt, isGenerating, roomType }: Props) {
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedBudget, setSelectedBudget] = useState<string | null>(null);
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [sliderValues, setSliderValues] = useState<Record<string, number>>({
    brightness: 50,
    warmth: 50,
    budget_feel: 50,
    intensity: 50,
  });
  const [expandedSection, setExpandedSection] = useState<string | null>("prompt");

  const handleSend = () => {
    if (!prompt.trim() && !selectedStyle) return;
    const finalPrompt = prompt.trim() || `Style ${selectedStyle}`;
    onSendPrompt(finalPrompt, {
      style: selectedStyle ?? undefined,
      budget: selectedBudget ?? undefined,
      zones: selectedZones.length > 0 ? selectedZones : undefined,
      sliders: sliderValues,
    });
    setPrompt("");
  };

  const toggleZone = (zone: string) => {
    setSelectedZones((prev) =>
      prev.includes(zone) ? prev.filter((z) => z !== zone) : [...prev, zone]
    );
  };

  const SectionToggle = ({
    icon: Icon,
    label,
    sectionKey,
  }: {
    icon: any;
    label: string;
    sectionKey: string;
  }) => (
    <button
      onClick={() => setExpandedSection(expandedSection === sectionKey ? null : sectionKey)}
      className="flex items-center justify-between w-full py-2.5 text-sm font-medium text-foreground hover:text-primary transition-colors"
    >
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        {label}
      </div>
      <ChevronDown
        className={`w-4 h-4 text-muted-foreground transition-transform ${
          expandedSection === sectionKey ? "rotate-180" : ""
        }`}
      />
    </button>
  );

  return (
    <div className="w-full lg:w-80 bg-card border-l border-border flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <span className="text-sm font-semibold text-foreground font-display">
          Contrôles
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {/* Prompt Section */}
        <SectionToggle icon={Wand2} label="Instructions" sectionKey="prompt" />
        {expandedSection === "prompt" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="space-y-3 pb-3"
          >
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Décrivez les changements souhaités…"
                rows={3}
                className="w-full rounded-xl bg-muted/50 border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <div className="absolute bottom-2 right-2 flex gap-1">
                <button
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                  title="Entrée vocale (Alex)"
                >
                  <Mic className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            <Button
              onClick={handleSend}
              disabled={isGenerating || (!prompt.trim() && !selectedStyle)}
              className="w-full gap-2"
              size="sm"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Génération…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Générer 3 versions
                </>
              )}
            </Button>

            {/* Quick Prompts */}
            <div className="flex flex-wrap gap-1.5">
              {[
                "Peindre les murs en blanc",
                "Armoires vertes",
                "Comptoir en granit",
                "Ajouter un dosseret",
                "Moderniser",
              ].map((qp) => (
                <button
                  key={qp}
                  onClick={() => setPrompt(qp)}
                  className="px-2.5 py-1 rounded-lg bg-muted/50 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  {qp}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Zones */}
        <SectionToggle icon={Layers} label="Zones à modifier" sectionKey="zones" />
        {expandedSection === "zones" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="pb-3"
          >
            <div className="flex flex-wrap gap-1.5">
              {EDITABLE_ZONES.map((zone) => (
                <button
                  key={zone}
                  onClick={() => toggleZone(zone)}
                  className={`
                    px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all
                    ${selectedZones.includes(zone)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }
                  `}
                >
                  {ZONE_LABELS[zone] || zone}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Styles */}
        <SectionToggle icon={Paintbrush} label="Style" sectionKey="style" />
        {expandedSection === "style" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="pb-3"
          >
            <div className="flex flex-wrap gap-1.5">
              {STYLE_PRESETS.map((style) => (
                <button
                  key={style}
                  onClick={() => setSelectedStyle(selectedStyle === style ? null : style)}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                    ${selectedStyle === style
                      ? "bg-secondary text-secondary-foreground shadow-[var(--shadow-glow)]"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }
                  `}
                >
                  {style}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Sliders */}
        <SectionToggle icon={Sparkles} label="Ambiance" sectionKey="sliders" />
        {expandedSection === "sliders" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="space-y-4 pb-3"
          >
            {SLIDERS.map((s) => (
              <div key={s.key}>
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>{s.min}</span>
                  <span>{s.max}</span>
                </div>
                <Slider
                  value={[sliderValues[s.key]]}
                  onValueChange={([v]) =>
                    setSliderValues((prev) => ({ ...prev, [s.key]: v }))
                  }
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>
            ))}
          </motion.div>
        )}

        {/* Budget */}
        <SectionToggle icon={DollarSign} label="Budget" sectionKey="budget" />
        {expandedSection === "budget" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="pb-3"
          >
            <div className="space-y-1.5">
              {BUDGET_FILTERS.map((b) => (
                <button
                  key={b.key}
                  onClick={() =>
                    setSelectedBudget(selectedBudget === b.key ? null : b.key)
                  }
                  className={`
                    w-full text-left px-3 py-2 rounded-lg text-sm transition-all
                    ${selectedBudget === b.key
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "hover:bg-muted/50 text-foreground"
                    }
                  `}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom CTA (Mobile) */}
      <div className="lg:hidden px-4 py-3 border-t border-border bg-card">
        <div className="flex gap-2">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Décrivez les changements…"
            className="flex-1 h-10 rounded-xl bg-muted/50 border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
          />
          <Button size="icon" onClick={handleSend} disabled={isGenerating}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
