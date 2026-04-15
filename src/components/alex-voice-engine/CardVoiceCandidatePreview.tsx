import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Star, Shield, Mic } from "lucide-react";

interface Props {
  profile: any;
  onPreview?: () => void;
  onActivate?: () => void;
}

export default function CardVoiceCandidatePreview({ profile, onPreview, onActivate }: Props) {
  const isDefault = profile.is_default;
  const isActive = profile.is_active;

  return (
    <Card className={`relative overflow-hidden transition-all ${isDefault ? "ring-2 ring-primary" : ""}`}>
      {isDefault && (
        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-bl-md font-medium">
          Principal
        </div>
      )}
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">{profile.profile_name || profile.profile_key}</span>
        </div>

        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-xs">{profile.language}</Badge>
          <Badge variant="outline" className="text-xs">{profile.accent_target}</Badge>
          <Badge variant="outline" className="text-xs">{profile.tone_style}</Badge>
          {isActive && <Badge className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Actif</Badge>}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div>Stabilité: <span className="text-foreground font-medium">{profile.stability ?? "—"}</span></div>
          <div>Similarité: <span className="text-foreground font-medium">{profile.similarity_boost ?? "—"}</span></div>
          <div>Vitesse: <span className="text-foreground font-medium">{profile.speech_rate}</span></div>
          <div>Fournisseur: <span className="text-foreground font-medium">{profile.provider_primary}</span></div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={onPreview}>
            <Play className="w-3 h-3 mr-1" /> Écouter
          </Button>
          {!isDefault && (
            <Button size="sm" className="flex-1 text-xs" onClick={onActivate}>
              <Star className="w-3 h-3 mr-1" /> Activer
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
