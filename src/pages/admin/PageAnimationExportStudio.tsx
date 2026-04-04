/**
 * PageAnimationExportStudio — Admin page to preview & export Alex booking demo videos
 */
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import {
  Play,
  Pause,
  Download,
  Film,
  Smartphone,
  Monitor,
  RotateCcw,
  Volume2,
  VolumeX,
  Settings,
  Sparkles,
  Check,
  Clock,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// Mock scene data matching the Remotion timeline
const SCENES = [
  { id: "greeting", label: "Salutation Alex", type: "alex-text", frameStart: 30, frameEnd: 80, icon: "💬" },
  { id: "user-problem", label: "Problème utilisateur", type: "user-text", frameStart: 80, frameEnd: 130, icon: "👤" },
  { id: "ask-photo", label: "Demande de photo", type: "alex-text", frameStart: 190, frameEnd: 230, icon: "📷" },
  { id: "photo-upload", label: "Upload photo", type: "user-image", frameStart: 230, frameEnd: 260, icon: "🖼️" },
  { id: "diagnosis", label: "Diagnostic IA", type: "alex-diagnosis", frameStart: 320, frameEnd: 380, icon: "🔍" },
  { id: "recommendation", label: "Recommandation", type: "alex-recommendation", frameStart: 380, frameEnd: 430, icon: "⭐" },
  { id: "why-choice", label: "Pourquoi ce choix", type: "alex-why", frameStart: 430, frameEnd: 500, icon: "✅" },
  { id: "calendar", label: "Créneaux disponibles", type: "alex-calendar", frameStart: 500, frameEnd: 570, icon: "📅" },
  { id: "slot-ask", label: "Proposition créneau", type: "alex-text", frameStart: 570, frameEnd: 620, icon: "🗓️" },
  { id: "user-confirm", label: "Confirmation utilisateur", type: "user-text", frameStart: 620, frameEnd: 660, icon: "👍" },
  { id: "booking-confirmed", label: "Rendez-vous confirmé", type: "booking-confirmed", frameStart: 660, frameEnd: 750, icon: "🎉" },
];

const TOTAL_FRAMES = 750;
const FPS = 30;
const DURATION_S = TOTAL_FRAMES / FPS;

type ExportFormat = "vertical" | "horizontal";
type ExportStatus = "idle" | "rendering" | "complete" | "error";

export default function PageAnimationExportStudio() {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("vertical");
  const [exportStatus, setExportStatus] = useState<ExportStatus>("idle");
  const [exportProgress, setExportProgress] = useState(0);
  const [speed, setSpeed] = useState(1);

  // Editable fields
  const [contractorName, setContractorName] = useState("Isolation Solution Royal");
  const [contractorCity, setContractorCity] = useState("Laval");
  const [appointmentDay, setAppointmentDay] = useState("Mardi");
  const [appointmentTime, setAppointmentTime] = useState("11h");

  const currentTime = (currentFrame / FPS).toFixed(1);
  const activeScene = SCENES.find(
    (s) => currentFrame >= s.frameStart && currentFrame < s.frameEnd
  );

  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      // Simulate playback
      const interval = setInterval(() => {
        setCurrentFrame((prev) => {
          if (prev >= TOTAL_FRAMES - 1) {
            clearInterval(interval);
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, (1000 / FPS) / speed);
      // Store to clean up
      setTimeout(() => clearInterval(interval), (TOTAL_FRAMES / FPS / speed) * 1000 + 100);
    }
  };

  const handleExport = () => {
    setExportStatus("rendering");
    setExportProgress(0);
    toast.info(`Rendu ${exportFormat === "vertical" ? "9:16" : "16:9"} en cours…`);

    // Simulate rendering progress
    const interval = setInterval(() => {
      setExportProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setExportStatus("complete");
          toast.success("Vidéo générée avec succès !");
          return 100;
        }
        return prev + Math.random() * 8;
      });
    }, 300);
  };

  const handleDownload = () => {
    const filename = exportFormat === "vertical"
      ? "unpro-booking-demo-vertical.mp4"
      : "unpro-booking-demo-horizontal.mp4";
    toast.success(`Téléchargement de ${filename}`);
  };

  const handleReset = () => {
    setCurrentFrame(0);
    setIsPlaying(false);
    setExportStatus("idle");
    setExportProgress(0);
  };

  return (
    <>
      <Helmet>
        <title>Animation Export Studio — UNPRO</title>
        <meta name="description" content="Studio d'export vidéo marketing UNPRO" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border/40 bg-card/50 backdrop-blur-xl sticky top-0 z-40">
          <div className="container max-w-7xl flex items-center justify-between py-3 px-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
                <Film className="w-4.5 h-4.5 text-primary" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-foreground">Animation Export Studio</h1>
                <p className="text-[11px] text-muted-foreground">Démo booking Alex → Vidéo marketing</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">
                {DURATION_S.toFixed(0)}s · {FPS}fps
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                {SCENES.length} scènes
              </Badge>
            </div>
          </div>
        </div>

        <div className="container max-w-7xl px-4 py-6 space-y-6">
          {/* Main layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Preview area */}
            <div className="lg:col-span-2 space-y-4">
              {/* Preview card */}
              <Card className="border-border/40 bg-card/80 overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative aspect-video bg-[#0a0e1a] rounded-t-lg flex items-center justify-center overflow-hidden">
                    {/* Simulated preview */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-48 sm:w-56 h-[340px] sm:h-[400px] rounded-[1.5rem] border border-border/30 bg-[#111827] overflow-hidden shadow-2xl">
                        {/* Mini phone header */}
                        <div className="px-3 py-2 border-b border-border/20 bg-[#1a2236]/60 flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[8px] text-primary font-bold">A</div>
                          <div>
                            <div className="text-[9px] font-bold text-foreground">Alex · UNPRO</div>
                            <div className="text-[7px] text-muted-foreground">
                              {isPlaying ? "En ligne · Parle…" : "En ligne"}
                            </div>
                          </div>
                        </div>
                        {/* Chat preview simulation */}
                        <div className="p-2 space-y-1.5 overflow-hidden h-full">
                          {SCENES.filter((s) => currentFrame >= s.frameStart).map((scene) => (
                            <motion.div
                              key={scene.id}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`rounded-lg px-2 py-1.5 text-[7px] ${
                                scene.type.startsWith("user")
                                  ? "bg-primary ml-auto max-w-[80%] text-primary-foreground"
                                  : scene.type === "booking-confirmed"
                                  ? "bg-success/10 border border-success/30 text-center"
                                  : "bg-muted/50 max-w-[85%] text-foreground"
                              }`}
                            >
                              <span className="opacity-70 mr-1">{scene.icon}</span>
                              {scene.label}
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Overlay: current time */}
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <Badge className="bg-background/80 text-foreground text-[10px] backdrop-blur-sm border-border/30">
                        <Clock className="w-3 h-3 mr-1" /> {currentTime}s / {DURATION_S.toFixed(0)}s
                      </Badge>
                    </div>

                    {/* Active scene label */}
                    {activeScene && (
                      <div className="absolute bottom-3 left-3">
                        <Badge className="bg-primary/20 text-primary text-[10px] border-primary/30">
                          {activeScene.icon} {activeScene.label}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Playback controls */}
                  <div className="p-4 space-y-3 border-t border-border/30">
                    {/* Timeline */}
                    <div className="relative">
                      <Slider
                        value={[currentFrame]}
                        min={0}
                        max={TOTAL_FRAMES}
                        step={1}
                        onValueChange={([v]) => setCurrentFrame(v)}
                        className="w-full"
                      />
                      {/* Scene markers */}
                      <div className="flex mt-1 relative h-2">
                        {SCENES.map((scene) => (
                          <div
                            key={scene.id}
                            className={`absolute h-1.5 rounded-full ${
                              currentFrame >= scene.frameStart
                                ? "bg-primary/40"
                                : "bg-muted-foreground/15"
                            }`}
                            style={{
                              left: `${(scene.frameStart / TOTAL_FRAMES) * 100}%`,
                              width: `${((scene.frameEnd - scene.frameStart) / TOTAL_FRAMES) * 100}%`,
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={handleReset}>
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" onClick={handlePlayPause}>
                          {isPlaying ? (
                            <Pause className="w-3.5 h-3.5" />
                          ) : (
                            <Play className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <Label className="text-[10px] text-muted-foreground">Vitesse</Label>
                          <select
                            value={speed}
                            onChange={(e) => setSpeed(Number(e.target.value))}
                            className="text-[10px] bg-muted/50 border border-border/30 rounded px-1.5 py-0.5 text-foreground"
                          >
                            <option value={0.5}>0.5x</option>
                            <option value={1}>1x</option>
                            <option value={1.5}>1.5x</option>
                            <option value={2}>2x</option>
                          </select>
                        </div>
                        <button
                          onClick={() => setVoiceEnabled(!voiceEnabled)}
                          className="p-1.5 rounded-lg hover:bg-muted/50"
                        >
                          {voiceEnabled ? (
                            <Volume2 className="w-4 h-4 text-primary" />
                          ) : (
                            <VolumeX className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Scene timeline */}
              <Card className="border-border/40 bg-card/80">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    Timeline des scènes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {SCENES.map((scene) => {
                    const isActive = currentFrame >= scene.frameStart && currentFrame < scene.frameEnd;
                    const isDone = currentFrame >= scene.frameEnd;
                    return (
                      <button
                        key={scene.id}
                        onClick={() => setCurrentFrame(scene.frameStart)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${
                          isActive
                            ? "bg-primary/10 border border-primary/30"
                            : isDone
                            ? "bg-success/5 border border-success/10"
                            : "bg-muted/20 border border-transparent hover:bg-muted/40"
                        }`}
                      >
                        <span className="text-sm">{scene.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium truncate ${
                            isActive ? "text-primary" : isDone ? "text-success" : "text-foreground/70"
                          }`}>
                            {scene.label}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {(scene.frameStart / FPS).toFixed(1)}s → {(scene.frameEnd / FPS).toFixed(1)}s
                          </p>
                        </div>
                        {isDone && <Check className="w-3.5 h-3.5 text-success flex-shrink-0" />}
                        {isActive && (
                          <div className="w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Right panel — Settings & Export */}
            <div className="space-y-4">
              {/* Customization */}
              <Card className="border-border/40 bg-card/80">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Settings className="w-4 h-4 text-primary" />
                    Personnalisation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Entrepreneur</Label>
                    <Input
                      value={contractorName}
                      onChange={(e) => setContractorName(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Ville</Label>
                    <Input
                      value={contractorCity}
                      onChange={(e) => setContractorCity(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Jour</Label>
                      <Input
                        value={appointmentDay}
                        onChange={(e) => setAppointmentDay(e.target.value)}
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Heure</Label>
                      <Input
                        value={appointmentTime}
                        onChange={(e) => setAppointmentTime(e.target.value)}
                        className="text-xs h-8"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <Label className="text-xs">Voix Alex</Label>
                    <Switch checked={voiceEnabled} onCheckedChange={setVoiceEnabled} />
                  </div>
                </CardContent>
              </Card>

              {/* Format selection */}
              <Card className="border-border/40 bg-card/80">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Film className="w-4 h-4 text-primary" />
                    Format d'export
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs value={exportFormat} onValueChange={(v) => setExportFormat(v as ExportFormat)}>
                    <TabsList className="w-full">
                      <TabsTrigger value="vertical" className="flex-1 text-xs gap-1.5">
                        <Smartphone className="w-3.5 h-3.5" /> 9:16
                      </TabsTrigger>
                      <TabsTrigger value="horizontal" className="flex-1 text-xs gap-1.5">
                        <Monitor className="w-3.5 h-3.5" /> 16:9
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="vertical" className="mt-3">
                      <div className="text-[11px] text-muted-foreground space-y-1">
                        <p>📱 1080 × 1920 px</p>
                        <p>Optimisé Reels, TikTok, Stories</p>
                      </div>
                    </TabsContent>
                    <TabsContent value="horizontal" className="mt-3">
                      <div className="text-[11px] text-muted-foreground space-y-1">
                        <p>🖥️ 1920 × 1080 px</p>
                        <p>Optimisé YouTube, Landing page, Ads</p>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Export */}
              <Card className="border-border/40 bg-card/80">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Export
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {exportStatus === "idle" && (
                    <Button onClick={handleExport} className="w-full gap-2" size="sm">
                      <Film className="w-4 h-4" />
                      Exporter la vidéo
                    </Button>
                  )}

                  {exportStatus === "rendering" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Rendu en cours…</span>
                        <span className="text-primary font-medium">
                          {Math.min(100, Math.round(exportProgress))}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                        <motion.div
                          className="h-full bg-primary rounded-full"
                          animate={{ width: `${Math.min(100, exportProgress)}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </div>
                  )}

                  {exportStatus === "complete" && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-success text-xs">
                        <Check className="w-4 h-4" />
                        <span className="font-medium">Vidéo prête !</span>
                      </div>
                      <Button onClick={handleDownload} className="w-full gap-2" size="sm" variant="outline">
                        <Download className="w-4 h-4" />
                        Télécharger MP4
                      </Button>
                      <Button onClick={handleReset} variant="ghost" size="sm" className="w-full gap-2 text-xs">
                        <RotateCcw className="w-3.5 h-3.5" />
                        Nouvel export
                      </Button>
                    </div>
                  )}

                  {exportStatus === "error" && (
                    <div className="space-y-2">
                      <p className="text-xs text-destructive">Erreur lors du rendu.</p>
                      <Button onClick={handleExport} variant="destructive" size="sm" className="w-full gap-2">
                        <RotateCcw className="w-3.5 h-3.5" />
                        Réessayer
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
