import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowDown, Plus, Shield } from "lucide-react";
import { useVoiceFallbacks, useVoiceProfiles } from "@/hooks/useAlexVoiceEngine";
import { Skeleton } from "@/components/ui/skeleton";

export default function PanelFallbackVoiceLogic() {
  const { data: fallbacks = [], isLoading: fbLoading } = useVoiceFallbacks();
  const { data: profiles = [], isLoading: profLoading } = useVoiceProfiles();

  if (fbLoading || profLoading) return <Skeleton className="h-48" />;

  const primaryProfile = profiles.find((p: any) => p.is_default);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          Chaîne de fallback voix
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Primary */}
        <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground text-xs">Principal</Badge>
            <span className="font-medium text-sm">{primaryProfile?.profile_name || primaryProfile?.profile_key || "Non configuré"}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {primaryProfile?.provider_primary} — {primaryProfile?.language} — {primaryProfile?.accent_target}
          </p>
        </div>

        {/* Fallback chain */}
        {fallbacks.map((fb: any, i: number) => (
          <div key={fb.id}>
            <div className="flex justify-center py-1">
              <ArrowDown className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Fallback #{fb.priority_rank}</Badge>
                <span className="font-medium text-sm">{(fb.fallback as any)?.profile_name || (fb.fallback as any)?.profile_key}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {(fb.fallback as any)?.provider_primary} — {(fb.fallback as any)?.language}
              </p>
            </div>
          </div>
        ))}

        {/* Final fallback */}
        <div className="flex justify-center py-1">
          <ArrowDown className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="p-3 rounded-lg border border-dashed bg-muted/10">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-400">Dernier recours</Badge>
            <span className="text-sm text-muted-foreground">Mode texte chat (TTS indisponible)</span>
          </div>
        </div>

        {fallbacks.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">Aucun fallback configuré. Ajoutez des voix de secours.</p>
        )}
      </CardContent>
    </Card>
  );
}
