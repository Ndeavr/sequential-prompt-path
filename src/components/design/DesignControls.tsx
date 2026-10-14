/**
 * UNPRO Design — Right Panel Controls
 * Prompt bar, inspiration uploads, materials, colors, style presets, budget, actions
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Mic, Sparkles, Paintbrush, Layers, DollarSign,
  Wand2, X, ChevronDown, ImagePlus, Palette, Gem, type LucideIcon
} from "lucide-react";
import { useAlexVoiceInput } from "@/hooks/useAlexVoiceInput";
import { prepareDesignPhoto } from "@/lib/design/photo";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  STYLE_PRESETS, BUDGET_FILTERS, SLIDERS, EDITABLE_ZONES, ZONE_LABELS,
  MATERIAL_OPTIONS, COLOR_PALETTES, ZONES_BY_ROOM,
} from "./data";

interface Props {
  onSendPrompt: (prompt: string, options?: {
    style?: string;
    budget?: string;
    zones?: string[];
    sliders?: Record<string, number>;
    inspirationImages?: string[];
    materials?: string[];
    colorPalette?: string;
  }) => void;
  isGenerating: boolean;
  roomType: string | null;
}

export default function DesignControls({ onSendPrompt, isGenerating, roomType }: Props) {
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedBudget, setSelectedBudget] = useState<string | null>(null);
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [selectedColorPalette, setSelectedColorPalette] = useState<string | null>(null);
  const [inspirationImages, setInspirationImages] = useState<string[]>([]);
  const [inspirationError, setInspirationError] = useState<string | null>(null);
  const [sliderValues, setSliderValues] = useState<Record<string, number>>({
    brightness: 50,
    warmth: 50,
    budget_feel: 50,
    intensity: 50,
  });
  const [expandedSection, setExpandedSection] = useState<string | null>("prompt");
  const inspoInputRef = useRef<HTMLInputElement>(null);

  const voice = useAlexVoiceInput({ onTranscript: (text, final) => {
    if (final) setPrompt((previous) => [previous, text].filter(Boolean).join(" "));
  } });
  const { stopListening } = voice;
  useEffect(() => () => stopListening(), [stopListening]);
  const canSend = !!(prompt.trim() || selectedStyle || inspirationImages.length || selectedMaterials.length || selectedColorPalette || selectedZones.length || selectedBudget);

  const handleSend = () => {
    if (isGenerating || !canSend) return;
    voice.stopListening();
    const finalPrompt = prompt.trim() || (inspirationImages.length > 0 ? "Reproduire ce style d'inspiration" : (selectedStyle ? `Style ${selectedStyle}` : "Rénover selon les options sélectionnées"));
    onSendPrompt(finalPrompt, {
      style: selectedStyle ?? undefined,
      budget: selectedBudget ?? undefined,
      zones: selectedZones.length > 0 ? selectedZones : undefined,
      sliders: sliderValues,
      inspirationImages: inspirationImages.length > 0 ? inspirationImages : undefined,
      materials: selectedMaterials.length > 0 ? selectedMaterials : undefined,
      colorPalette: selectedColorPalette ?? undefined,
    });

  };

  const toggleZone = (zone: string) => {
    setSelectedZones((prev) =>
      prev.includes(zone) ? prev.filter((z) => z !== zone) : [...prev, zone]
    );
  };

  const toggleMaterial = (mat: string) => {
    setSelectedMaterials((prev) =>
      prev.includes(mat) ? prev.filter((m) => m !== mat) : prev.length < 3 ? [...prev, mat] : prev
    );
  };

  const handleInspirationUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).slice(0, 3 - inspirationImages.length).forEach(async (file) => {
      try {
      const reader = new FileReader();
      reader.onload = () => {
        setInspirationImages((prev) => prev.length < 3 ? [...prev, reader.result as string] : prev);
      };
      reader.readAsDataURL(await prepareDesignPhoto(file));
      setInspirationError(null);
      } catch (error) { setInspirationError(error instanceof Error ? error.message : "Impossible de lire cette photo."); }
    });
    e.target.value = "";
  }, [inspirationImages.length]);

  const removeInspiration = (index: number) => {
    setInspirationImages((prev) => prev.filter((_, i) => i !== index));
  };

  const SectionToggle = ({
    icon: Icon,
    label,
    sectionKey,
    badge,
  }: {
    icon: LucideIcon;
    label: string;
    sectionKey: string;
    badge?: number;
  }) => (
    <button
      onClick={() => setExpandedSection(expandedSection === sectionKey ? null : sectionKey)}
      className="flex items-center justify-between w-full py-2.5 text-sm font-medium text-foreground hover:text-primary transition-colors"
    >
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        {label}
        {badge && badge > 0 ? (
          <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
            {badge}
          </span>
        ) : null}
      </div>
      <ChevronDown
        className={`w-4 h-4 text-muted-foreground transition-transform ${
          expandedSection === sectionKey ? "rotate-180" : ""
        }`}
      />
    </button>
  );

  return (
    <div className="w-full lg:w-80 bg-card border-l border-border flex flex-col lg:h-full min-w-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <span className="text-sm font-semibold text-foreground font-display">
          Contrôles
        </span>
      </div>

      <div className="flex-1 lg:overflow-y-auto px-4 py-3 space-y-1">
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
                  title={voice.isSupported ? "Dicter mes instructions" : "Utilisez le micro du clavier"}
                  aria-label={voice.isListening ? "Arrêter la dictée" : "Dicter mes instructions"}
                  aria-pressed={voice.isListening}
                  disabled={isGenerating || !voice.isSupported}
                  onClick={voice.toggleListening}
                >
                  <Mic className={`w-4 h-4 ${voice.isListening ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
                </button>
              </div>
            </div>

            {voice.liveTranscript && <p className="text-sm text-muted-foreground" role="status">{voice.liveTranscript}</p>}
            {voice.permissionDenied && <p className="text-sm text-destructive" role="alert">Autorisez le micro dans votre navigateur ou utilisez le micro du clavier.</p>}
            <Button
              onClick={handleSend}
              disabled={isGenerating || !canSend}
              className="hidden lg:flex w-full gap-2"
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
                "J'en veux une comme ça",
                "Peindre les murs en blanc",
                "Armoires vertes",
                "Comptoir en granit",
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

        {/* ─── Inspiration Upload ─── */}
        <SectionToggle icon={ImagePlus} label="Inspiration" sectionKey="inspiration" badge={inspirationImages.length} />
        {expandedSection === "inspiration" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="space-y-3 pb-3"
          >
            <p className="text-xs text-muted-foreground">
              Téléversez des photos de référence (max 3). L'IA reproduira le style.
            </p>

            {/* Inspiration grid */}
            <div className="grid grid-cols-3 gap-2">
              {inspirationImages.map((img, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-border group">
                  <img src={img} alt={`Inspo ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeInspiration(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-foreground" />
                  </button>
                </div>
              ))}
              {inspirationImages.length < 3 && (
                <button
                  onClick={() => inspoInputRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 transition-colors"
                >
                  <ImagePlus className="w-5 h-5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">Ajouter</span>
                </button>
              )}
            </div>

            <input
              ref={inspoInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleInspirationUpload}
            />
            {inspirationError && <p role="alert" className="text-xs text-destructive">{inspirationError}</p>}

            {inspirationImages.length > 0 && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-primary/5 border border-primary/20">
                <Sparkles className="w-4 h-4 text-primary shrink-0" />
                <p className="text-xs text-foreground">
                  <span className="font-medium">J'en veux une comme ça !</span> — L'IA utilisera ces photos comme référence de style.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* ─── Materials ─── */}
        <SectionToggle icon={Gem} label="Matériaux" sectionKey="materials" badge={selectedMaterials.length} />
        {expandedSection === "materials" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="pb-3 space-y-2"
          >
            <p className="text-xs text-muted-foreground">Sélectionnez jusqu'à 3 matériaux préférés.</p>
            <div className="flex flex-wrap gap-1.5">
              {MATERIAL_OPTIONS.map((mat) => (
                <button
                  key={mat.key}
                  onClick={() => toggleMaterial(mat.key)}
                  className={`
                    px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1
                    ${selectedMaterials.includes(mat.key)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }
                  `}
                >
                  <span>{mat.emoji}</span>
                  {mat.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ─── Colors ─── */}
        <SectionToggle icon={Palette} label="Couleurs" sectionKey="colors" />
        {expandedSection === "colors" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="pb-3 space-y-2"
          >
            <p className="text-xs text-muted-foreground">Choisissez une palette de couleurs.</p>
            <div className="space-y-2">
              {COLOR_PALETTES.map((palette) => (
                <button
                  key={palette.key}
                  onClick={() => setSelectedColorPalette(selectedColorPalette === palette.key ? null : palette.key)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left
                    ${selectedColorPalette === palette.key
                      ? "bg-primary/10 border-2 border-primary/30"
                      : "bg-muted/30 border-2 border-transparent hover:bg-muted/50"
                    }
                  `}
                >
                  <div className="flex gap-1">
                    {palette.colors.map((color, i) => (
                      <div
                        key={i}
                        className="w-5 h-5 rounded-full border border-border/50"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-medium text-foreground">{palette.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Zones */}
        <SectionToggle icon={Layers} label="Zones à modifier" sectionKey="zones" badge={selectedZones.length} />
        {expandedSection === "zones" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="pb-3"
          >
            <div className="flex flex-wrap gap-1.5">
              {(roomType && ZONES_BY_ROOM[roomType] ? ZONES_BY_ROOM[roomType] : EDITABLE_ZONES).map((zone) => (
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

      {/* Mobile action stays reachable; instructions are preserved after failures. */}
      <div className="lg:hidden sticky bottom-0 px-4 pt-3 pb-[calc(4.5rem+env(safe-area-inset-bottom))] border-t border-border bg-card z-10">
        <Button className="w-full gap-2 h-11" onClick={handleSend} disabled={isGenerating || !canSend}>
          <Sparkles className="w-4 h-4" />
          {isGenerating ? "Génération…" : "Générer 3 versions"}
        </Button>
      </div>
    </div>
  );
}
