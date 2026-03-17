/**
 * UNPRO Design — Mini Landing Page with Before/After showcase + Upload
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Camera, Image, Sparkles, ArrowRight, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROOM_TYPES } from "./data";
import LikeShareButtons from "@/components/shared/LikeShareButtons";

import before1 from "@/assets/design-before-1.jpg";
import after1 from "@/assets/design-after-1.jpg";
import before2 from "@/assets/design-before-2.jpg";
import after2 from "@/assets/design-after-2.jpg";
import before3 from "@/assets/design-before-3.jpg";
import after3 from "@/assets/design-after-3.jpg";

const SHOWCASES = [
  { before: before1, after: after1, label: "Cuisine", room: "kitchen" },
  { before: before2, after: after2, label: "Salle de bain", room: "bathroom" },
  { before: before3, after: after3, label: "Salon", room: "living_room" },
];

function BeforeAfterSlider({ before, after }: { before: string; after: string }) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(50);
  const [dragging, setDragging] = useState(false);

  const update = useCallback((clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    setPos(Math.max(2, Math.min(98, ((clientX - rect.left) / rect.width) * 100)));
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    setDragging(true);
    update(e.clientX);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [update]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (dragging) update(e.clientX);
  }, [dragging, update]);

  const onPointerUp = useCallback(() => setDragging(false), []);

  return (
    <div
      ref={sliderRef}
      className="relative aspect-[4/3] overflow-hidden cursor-col-resize select-none touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Before = static base layer */}
      <img src={before} alt="Avant" className="absolute inset-0 w-full h-full object-cover" />
      {/* After = revealed from the right with clip-path */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
      >
        <img src={after} alt="Après" className="absolute inset-0 w-full h-full object-cover" />
      </div>
      {/* Slider handle */}
      <div className="absolute top-0 bottom-0 w-0.5 bg-white/90 shadow-lg" style={{ left: `${pos}%` }}>
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white shadow-lg flex items-center justify-center">
          <div className="flex gap-0.5">
            <div className="w-0.5 h-2.5 bg-muted-foreground/50 rounded-full" />
            <div className="w-0.5 h-2.5 bg-muted-foreground/50 rounded-full" />
          </div>
        </div>
      </div>
      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-background/80 backdrop-blur-sm text-muted-foreground">Avant</div>
      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-primary/90 backdrop-blur-sm text-primary-foreground">✨ Après</div>
    </div>
  );
}

interface Props {
  onUpload: (file: File, roomType?: string) => void;
}

export default function DesignUpload({ onUpload }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [activeShowcase, setActiveShowcase] = useState(0);
  const [showAfter, setShowAfter] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLDivElement>(null);

  // Auto-cycle showcases — slower rhythm
  useEffect(() => {
    const interval = setInterval(() => {
      setShowAfter(true);
      setTimeout(() => {
        setShowAfter(false);
        setTimeout(() => {
          setActiveShowcase((p) => (p + 1) % SHOWCASES.length);
        }, 600);
      }, 4500);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleSubmit = () => {
    if (file) onUpload(file, selectedRoom ?? undefined);
  };

  const clearPreview = () => {
    setPreview(null);
    setFile(null);
    setSelectedRoom(null);
  };

  const scrollToUpload = () => {
    uploadRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const current = SHOWCASES[activeShowcase];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* ─── HERO with Aura ─── */}
      <section className="relative min-h-[85vh] flex flex-col items-center justify-center px-4 py-16 overflow-hidden">
        {/* Aura background blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-primary/8 blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-15%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-secondary/6 blur-[100px] animate-pulse" style={{ animationDelay: "1.5s" }} />
          <div className="absolute top-[30%] right-[10%] w-[30vw] h-[30vw] rounded-full bg-accent/5 blur-[80px] animate-pulse" style={{ animationDelay: "3s" }} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 text-center max-w-3xl mx-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-5"
          >
            <Sparkles className="w-4 h-4" />
            UNPRO Design
          </motion.div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold text-foreground mb-4 leading-[1.1]">
            Visualisez votre
            <br />
            <span className="text-primary">rénovation</span> par IA
          </h1>

          <p className="text-muted-foreground text-lg sm:text-xl max-w-lg mx-auto mb-8">
            Téléversez une photo de votre pièce. L'IA génère des concepts de design en quelques secondes.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="gap-2 h-12 text-base font-semibold px-8" onClick={scrollToUpload}>
              <Upload className="w-5 h-5" />
              Commencer maintenant
            </Button>
          </div>
        </motion.div>

        {/* ─── Before / After Showcase ─── */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-2xl mx-auto mt-12"
        >
          <div className="relative rounded-2xl overflow-hidden shadow-[var(--shadow-2xl)] border border-border bg-card">
            {/* Image container */}
            <div className="relative aspect-[3/2] overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.img
                  key={`${activeShowcase}-${showAfter ? "after" : "before"}`}
                  src={showAfter ? current.after : current.before}
                  alt={showAfter ? "Après" : "Avant"}
                  className="absolute inset-0 w-full h-full object-cover"
                  initial={{ opacity: 0, scale: 1.03 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
                />
              </AnimatePresence>

              {/* Label badge */}
              <div className="absolute top-4 left-4 z-20">
                <span className={`
                  px-3 py-1.5 rounded-lg text-sm font-semibold backdrop-blur-md
                  ${showAfter
                    ? "bg-primary/90 text-primary-foreground"
                    : "bg-background/80 text-foreground"
                  }
                `}>
                  {showAfter ? "✨ Après — IA" : "Avant"}
                </span>
              </div>

              {/* Room label */}
              <div className="absolute bottom-4 left-4 z-20">
                <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-background/70 backdrop-blur-md text-muted-foreground">
                  {current.label}
                </span>
              </div>

              {/* Navigation arrows */}
              <div className="absolute bottom-4 right-4 z-20 flex gap-2">
                <button
                  onClick={() => setActiveShowcase((p) => (p - 1 + SHOWCASES.length) % SHOWCASES.length)}
                  className="w-8 h-8 rounded-full bg-background/70 backdrop-blur-md flex items-center justify-center hover:bg-background/90 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-foreground" />
                </button>
                <button
                  onClick={() => setActiveShowcase((p) => (p + 1) % SHOWCASES.length)}
                  className="w-8 h-8 rounded-full bg-background/70 backdrop-blur-md flex items-center justify-center hover:bg-background/90 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-foreground" />
                </button>
              </div>
            </div>

            {/* Dots */}
            <div className="flex items-center justify-center gap-2 py-3 bg-card">
              {SHOWCASES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setActiveShowcase(i); setShowAfter(false); }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === activeShowcase ? "w-6 bg-primary" : "w-1.5 bg-border hover:bg-muted-foreground/40"
                  }`}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ─── Stats bar ─── */}
      <section className="border-y border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto grid grid-cols-3 divide-x divide-border">
          {[
            { value: "10s", label: "par concept" },
            { value: "3", label: "variantes générées" },
            { value: "100%", label: "gratuit pour essayer" },
          ].map((s) => (
            <div key={s.label} className="py-5 text-center">
              <div className="text-xl sm:text-2xl font-display font-bold text-primary">{s.value}</div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Upload Section ─── */}
      <section ref={uploadRef} className="relative py-16 sm:py-24 px-4">
        {/* Subtle aura */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[50vw] h-[40vw] rounded-full bg-primary/5 blur-[100px]" />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-3">
              À votre tour
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Téléversez une photo et découvrez le potentiel de votre espace.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {!preview ? (
              <motion.div
                key="dropzone"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`
                  relative cursor-pointer rounded-2xl border-2 border-dashed p-10 sm:p-12
                  transition-all duration-300 group bg-card/60 backdrop-blur-sm
                  ${dragOver
                    ? "border-primary bg-primary/5 shadow-[var(--shadow-glow)]"
                    : "border-border hover:border-primary/50 hover:bg-muted/30"
                  }
                `}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                    <Upload className="w-7 h-7 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-foreground font-semibold text-lg">
                      Glissez votre photo ici
                    </p>
                    <p className="text-muted-foreground text-sm mt-1">
                      ou cliquez pour parcourir • JPG, PNG, WebP
                    </p>
                  </div>
                  <div className="flex gap-3 mt-2">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Camera className="w-4 h-4" />
                      Prendre une photo
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Image className="w-4 h-4" />
                      Galerie
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="relative rounded-2xl overflow-hidden bg-card border border-border shadow-[var(--shadow-lg)]">
                  <img src={preview} alt="Aperçu" className="w-full h-64 md:h-80 object-cover" />
                  <button
                    onClick={clearPreview}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
                  >
                    <X className="w-4 h-4 text-foreground" />
                  </button>
                  <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-background/80 backdrop-blur-sm text-sm text-foreground font-medium">
                    Photo prête
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-3">
                    Quel type de pièce ? (optionnel — l'IA peut le détecter)
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {ROOM_TYPES.map((room) => (
                      <button
                        key={room.key}
                        onClick={() => setSelectedRoom(selectedRoom === room.key ? null : room.key)}
                        className={`
                          px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                          ${selectedRoom === room.key
                            ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
                            : "bg-card border border-border text-foreground hover:border-primary/50"
                          }
                        `}
                      >
                        <span className="mr-1.5">{room.icon}</span>
                        {room.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Button onClick={handleSubmit} size="lg" className="w-full gap-2 h-12 text-base font-semibold">
                  <Sparkles className="w-5 h-5" />
                  Commencer le design
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ─── Before/After Grid ─── */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground text-center mb-10">
            Des transformations <span className="text-primary">spectaculaires</span>
          </h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {SHOWCASES.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.5 }}
                className="rounded-2xl overflow-hidden border border-border bg-card shadow-[var(--shadow-sm)]"
              >
                <BeforeAfterSlider before={s.before} after={s.after} />
                <div className="p-3 text-center">
                  <span className="text-sm font-medium text-foreground">{s.label}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">Glissez pour comparer</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Vote Section ─── */}
      <section className="relative py-16 px-4 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-[30%] w-[40vw] h-[30vw] rounded-full bg-primary/6 blur-[100px]" />
        </div>
        <div className="relative z-10 text-center max-w-lg mx-auto">
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-3">
            Votez sur des projets récents
          </h2>
          <p className="text-muted-foreground mb-6">
            C'est gratuit et instantané.
          </p>
          <Button size="lg" className="gap-2 h-12 text-base font-semibold px-10" onClick={scrollToUpload}>
            <Upload className="w-5 h-5" />
            Téléverser ma photo
          </Button>
        </div>
      </section>
    </div>
  );
}
