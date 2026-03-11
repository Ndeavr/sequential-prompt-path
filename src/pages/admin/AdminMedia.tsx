import { useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { useMediaOrchestrator, type MediaAsset } from "@/hooks/useMediaOrchestrator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Image as ImageIcon, Sparkles, Check, X, RefreshCw, Loader2,
  Wand2, Eye, Star, Palette, BarChart3, Camera,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const PURPOSES = [
  { value: "hero", label: "Hero / Landing" },
  { value: "seo", label: "Page SEO" },
  { value: "marketing", label: "Marketing" },
  { value: "profile", label: "Profil" },
  { value: "illustration", label: "Illustration" },
  { value: "background", label: "Arrière-plan" },
  { value: "general", label: "Général" },
];

const ASPECT_RATIOS = [
  { value: "16:9", label: "16:9 — Paysage" },
  { value: "9:16", label: "9:16 — Portrait" },
  { value: "1:1", label: "1:1 — Carré" },
  { value: "4:3", label: "4:3 — Classique" },
  { value: "4:5", label: "4:5 — Social" },
];

const STRATEGIES = [
  { value: "multi", label: "Multi-modèle (3 modèles)" },
  { value: "best", label: "Premium uniquement" },
  { value: "single", label: "Rapide (1 modèle)" },
];

const PRESETS = [
  { value: "unpro-premium", label: "UNPRO Premium" },
  { value: "unpro-contractor", label: "Entrepreneur" },
  { value: "unpro-homeowner", label: "Propriétaire" },
  { value: "unpro-seo", label: "SEO" },
  { value: "unpro-marketing", label: "Marketing" },
];

const statusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  generating: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  generated: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  approved: "bg-green-500/20 text-green-400 border border-green-500/30",
  rejected: "bg-destructive/20 text-destructive border border-destructive/30",
  failed: "bg-destructive text-destructive-foreground",
};

const ScoreBar = ({ label, value }: { label: string; value: number }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-caption">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium">{value}</span>
    </div>
    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  </div>
);

const AdminMedia = () => {
  const {
    assets, isLoading, generate, isGenerating,
    approve, reject, regenerate, isRegenerating,
  } = useMediaOrchestrator();

  const [prompt, setPrompt] = useState("");
  const [purpose, setPurpose] = useState("general");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [strategy, setStrategy] = useState("multi");
  const [preset, setPreset] = useState("unpro-premium");
  const [filter, setFilter] = useState<string>("all");

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    generate({ prompt, purpose, aspect_ratio: aspectRatio, strategy, style_preset: preset });
    setPrompt("");
  };

  const filteredAssets = filter === "all" ? assets : assets.filter(a => a.status === filter);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Palette className="h-6 w-6 text-primary" />
            AI Media Orchestrator
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Studio créatif IA — Génération multi-modèle avec scoring automatique
          </p>
        </div>

        {/* Generation Form */}
        <Card className="glass-surface border-border/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-primary" />
              Nouvelle génération
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Décrivez le visuel souhaité... Ex: Propriétaire québécois consultant son Score Maison sur tablette devant une maison moderne"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[80px] rounded-xl"
            />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-caption text-muted-foreground mb-1 block">Objectif</label>
                <Select value={purpose} onValueChange={setPurpose}>
                  <SelectTrigger className="rounded-xl h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PURPOSES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-caption text-muted-foreground mb-1 block">Ratio</label>
                <Select value={aspectRatio} onValueChange={setAspectRatio}>
                  <SelectTrigger className="rounded-xl h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ASPECT_RATIOS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-caption text-muted-foreground mb-1 block">Stratégie</label>
                <Select value={strategy} onValueChange={setStrategy}>
                  <SelectTrigger className="rounded-xl h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STRATEGIES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-caption text-muted-foreground mb-1 block">Style</label>
                <Select value={preset} onValueChange={setPreset}>
                  <SelectTrigger className="rounded-xl h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRESETS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="gap-2 rounded-xl w-full sm:w-auto"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {isGenerating ? "Génération en cours..." : "Générer"}
            </Button>
          </CardContent>
        </Card>

        {/* Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          {["all", "generating", "generated", "approved", "rejected", "failed"].map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "ghost"}
              className="rounded-lg text-xs h-8"
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "Tout" : f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== "all" && (
                <span className="ml-1 opacity-60">
                  ({assets.filter(a => a.status === f).length})
                </span>
              )}
            </Button>
          ))}
        </div>

        {/* Assets Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredAssets.length === 0 ? (
          <Card className="glass-surface border-border/30">
            <CardContent className="py-16 text-center">
              <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                Aucun asset média. Générez votre premier visuel ci-dessus.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredAssets.map((asset, i) => (
                <motion.div
                  key={asset.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <AssetCard
                    asset={asset}
                    onApprove={() => approve(asset.id)}
                    onReject={() => reject(asset.id)}
                    onRegenerate={() => regenerate(asset.id)}
                    isRegenerating={isRegenerating}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

const AssetCard = ({
  asset,
  onApprove,
  onReject,
  onRegenerate,
  isRegenerating,
}: {
  asset: MediaAsset;
  onApprove: () => void;
  onReject: () => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
}) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <Card className="glass-surface border-border/30 overflow-hidden group">
      {/* Image Preview */}
      <div className="relative aspect-video bg-muted/30 overflow-hidden">
        {asset.storage_url ? (
          <img
            src={asset.storage_url}
            alt={asset.alt_text || asset.request_prompt}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : asset.status === "generating" ? (
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          </div>
        )}

        {/* Score Badge */}
        {asset.overall_score > 0 && (
          <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1">
            <Star className="h-3 w-3 text-primary" />
            <span className="text-xs font-bold text-foreground">{asset.overall_score}</span>
          </div>
        )}

        {/* Status Badge */}
        <Badge className={`absolute top-2 left-2 text-[10px] ${statusColors[asset.status] || ""}`}>
          {asset.status}
        </Badge>
      </div>

      <CardContent className="p-3 space-y-2">
        <p className="text-xs font-medium text-foreground line-clamp-2">{asset.request_prompt}</p>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{asset.purpose}</Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{asset.aspect_ratio}</Badge>
          {asset.models_used?.length > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {asset.models_used.length} modèle{asset.models_used.length > 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {/* Score Details */}
        {showDetails && asset.overall_score > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="space-y-2 pt-2"
          >
            <ScoreBar label="Réalisme" value={asset.realism_score} />
            <ScoreBar label="Clarté" value={asset.clarity_score} />
            <ScoreBar label="Brand" value={asset.brand_consistency_score} />
            <ScoreBar label="Composition" value={asset.composition_score} />
            {asset.alt_text && (
              <p className="text-caption text-muted-foreground italic">Alt: {asset.alt_text}</p>
            )}
          </motion.div>
        )}

        <div className="flex items-center gap-1.5 pt-1">
          {asset.status === "generated" && (
            <>
              <Button size="sm" className="gap-1 rounded-lg h-7 text-[11px] flex-1" onClick={onApprove}>
                <Check className="h-3 w-3" /> Approuver
              </Button>
              <Button size="sm" variant="ghost" className="gap-1 rounded-lg h-7 text-[11px]" onClick={onReject}>
                <X className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1 rounded-lg h-7 text-[11px]"
                onClick={onRegenerate}
                disabled={isRegenerating}
              >
                <RefreshCw className={`h-3 w-3 ${isRegenerating ? "animate-spin" : ""}`} />
              </Button>
            </>
          )}
          {asset.overall_score > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="gap-1 rounded-lg h-7 text-[11px] ml-auto"
              onClick={() => setShowDetails(!showDetails)}
            >
              <BarChart3 className="h-3 w-3" />
              {showDetails ? "Masquer" : "Scores"}
            </Button>
          )}
        </div>

        <p className="text-caption text-muted-foreground">
          {formatDistanceToNow(new Date(asset.created_at), { addSuffix: true, locale: fr })}
        </p>
      </CardContent>
    </Card>
  );
};

export default AdminMedia;
