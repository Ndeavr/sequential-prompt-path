import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, ArrowLeft, AlertTriangle, CheckCircle2, Loader2, DollarSign, Wrench, Clock, Shield, ChevronRight, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Diagnostic {
  problem_detected: boolean;
  problem_label: string;
  problem_description: string;
  category: string;
  urgency: "faible" | "modere" | "urgent" | "critique";
  estimated_cost_min: number;
  estimated_cost_max: number;
  professional_type: string;
  priority_actions: string[];
  confidence: number;
  seasonal_note?: string;
}

const URGENCY_CONFIG = {
  faible: { color: "text-green-400", bg: "bg-green-500/15 border-green-500/30", label: "Faible", icon: CheckCircle2 },
  modere: { color: "text-yellow-400", bg: "bg-yellow-500/15 border-yellow-500/30", label: "Modéré", icon: Clock },
  urgent: { color: "text-orange-400", bg: "bg-orange-500/15 border-orange-500/30", label: "Urgent", icon: AlertTriangle },
  critique: { color: "text-red-400", bg: "bg-red-500/15 border-red-500/30", label: "Critique", icon: AlertTriangle },
};

const CATEGORY_LABELS: Record<string, string> = {
  structure: "Structure", toiture: "Toiture", plomberie: "Plomberie",
  electricite: "Électricité", isolation: "Isolation", humidite: "Humidité",
  revetement: "Revêtement", fenestration: "Fenestration", ventilation: "Ventilation", autre: "Autre",
};

export default function ProVisualSearchPage() {
  const navigate = useNavigate();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image trop volumineuse (max 10 Mo)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      // Extract base64 without the data URI prefix
      const base64 = dataUrl.split(",")[1];
      setImageBase64(base64);
      setDiagnostic(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const analyze = useCallback(async () => {
    if (!imageBase64) return;
    setIsAnalyzing(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/visual-search`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ image_base64: imageBase64 }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Erreur d'analyse");
      }

      const data = await response.json();
      setDiagnostic(data.diagnostic);
    } catch (e: any) {
      toast.error(e.message || "Impossible d'analyser l'image");
    } finally {
      setIsAnalyzing(false);
    }
  }, [imageBase64]);

  const reset = useCallback(() => {
    setImagePreview(null);
    setImageBase64(null);
    setDiagnostic(null);
  }, []);

  const formatPrice = (n: number) =>
    new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted/50 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-semibold">Diagnostic visuel IA</h1>
            <p className="text-xs text-muted-foreground">Prenez une photo, obtenez un diagnostic</p>
          </div>
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-24">
        <AnimatePresence mode="wait">
          {/* State 1: No image yet */}
          {!imagePreview && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="pt-8 space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold">Photographiez le problème</h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  Notre IA analyse votre photo et identifie le problème, l'urgence et le coût estimé.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all"
                >
                  <Camera className="w-8 h-8 text-primary" />
                  <span className="text-sm font-medium">Prendre une photo</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-dashed border-border hover:bg-muted/50 hover:border-muted-foreground/30 transition-all"
                >
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm font-medium">Galerie</span>
                </button>
              </div>

              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

              {/* Examples */}
              <div className="space-y-3 pt-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Exemples de problèmes détectables</p>
                <div className="grid grid-cols-2 gap-2">
                  {["Fissures de fondation", "Moisissure / humidité", "Dommages toiture", "Problèmes fenêtres"].map((ex) => (
                    <div key={ex} className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 border border-border/50">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-xs">{ex}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* State 2: Image loaded, no result yet */}
          {imagePreview && !diagnostic && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="pt-6 space-y-4"
            >
              <div className="relative rounded-2xl overflow-hidden border border-border/50">
                <img src={imagePreview} alt="Photo à analyser" className="w-full aspect-[4/3] object-cover" />
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                      <Sparkles className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-sm font-medium">Analyse en cours…</p>
                    <p className="text-xs text-muted-foreground">Identification du problème par IA</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={reset} className="flex-1 rounded-xl" disabled={isAnalyzing}>
                  <RotateCcw className="w-4 h-4 mr-2" /> Reprendre
                </Button>
                <Button onClick={analyze} className="flex-1 rounded-xl" disabled={isAnalyzing}>
                  {isAnalyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  {isAnalyzing ? "Analyse…" : "Analyser"}
                </Button>
              </div>
            </motion.div>
          )}

          {/* State 3: Results */}
          {diagnostic && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="pt-6 space-y-4"
            >
              {/* Thumbnail */}
              {imagePreview && (
                <div className="relative rounded-2xl overflow-hidden border border-border/50">
                  <img src={imagePreview} alt="Photo analysée" className="w-full aspect-[16/9] object-cover" />
                  <div className="absolute top-3 left-3">
                    <span className="px-3 py-1 rounded-full bg-background/80 backdrop-blur text-xs font-medium border border-border/50">
                      {CATEGORY_LABELS[diagnostic.category] || diagnostic.category}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className="px-3 py-1 rounded-full bg-primary/90 text-primary-foreground text-xs font-medium">
                      {Math.round(diagnostic.confidence * 100)}% confiance
                    </span>
                  </div>
                </div>
              )}

              {/* Problem header */}
              <div className="p-4 rounded-2xl bg-card border border-border/50 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <h3 className="text-lg font-bold leading-tight">{diagnostic.problem_label}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{diagnostic.problem_description}</p>
                  </div>
                </div>

                {/* Urgency badge */}
                {(() => {
                  const u = URGENCY_CONFIG[diagnostic.urgency];
                  const Icon = u.icon;
                  return (
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${u.bg}`}>
                      <Icon className={`w-4 h-4 ${u.color}`} />
                      <span className={`text-sm font-semibold ${u.color}`}>Urgence {u.label.toLowerCase()}</span>
                    </div>
                  );
                })()}
              </div>

              {/* Cost + Pro type */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-card border border-border/50 space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">Estimation</span>
                  </div>
                  <p className="text-lg font-bold">
                    {formatPrice(diagnostic.estimated_cost_min)} – {formatPrice(diagnostic.estimated_cost_max)}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-card border border-border/50 space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Wrench className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">Professionnel</span>
                  </div>
                  <p className="text-lg font-bold">{diagnostic.professional_type}</p>
                </div>
              </div>

              {/* Priority actions */}
              <div className="p-4 rounded-2xl bg-card border border-border/50 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  Actions prioritaires
                </h4>
                <div className="space-y-2">
                  {diagnostic.priority_actions.map((action, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
                      <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-sm leading-relaxed">{action}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Seasonal note */}
              {diagnostic.seasonal_note && (
                <div className="p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-3">
                  <Clock className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                  <p className="text-sm leading-relaxed">{diagnostic.seasonal_note}</p>
                </div>
              )}

              {/* CTAs */}
              <div className="space-y-3 pt-2">
                <Button
                  onClick={() => navigate(`/alex?context=visual-diagnostic&problem=${encodeURIComponent(diagnostic.problem_label)}&category=${diagnostic.category}`)}
                  className="w-full rounded-xl h-12 text-base font-semibold"
                >
                  Trouver un {diagnostic.professional_type.toLowerCase()}
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
                <Button variant="outline" onClick={reset} className="w-full rounded-xl">
                  <RotateCcw className="w-4 h-4 mr-2" /> Analyser une autre photo
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
