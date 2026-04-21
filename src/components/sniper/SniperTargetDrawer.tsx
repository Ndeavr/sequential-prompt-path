import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { getHeatLabel } from "@/services/planRecommendationService";
import { Zap, FileText, Send, Flame, Globe, Phone, Mail, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function SniperTargetDrawer({ targetId, open, onClose, onRefresh }: {
  targetId: string | null; open: boolean; onClose: () => void; onRefresh: () => void;
}) {
  const [target, setTarget] = useState<any>(null);
  const [variants, setVariants] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!targetId || !open) return;
    setLoading(true);
    Promise.all([
      supabase.from("sniper_targets" as any).select("*").eq("id", targetId).single(),
      supabase.from("sniper_message_variants" as any).select("*").eq("sniper_target_id", targetId).order("created_at", { ascending: false }),
      supabase.from("sniper_engagement_events" as any).select("*").eq("sniper_target_id", targetId).order("created_at", { ascending: false }).limit(20),
    ]).then(([tRes, vRes, eRes]) => {
      setTarget(tRes.data);
      setVariants((vRes.data || []) as any[]);
      setEvents((eRes.data || []) as any[]);
      setLoading(false);
    });
  }, [targetId, open]);

  async function runAction(fn: string) {
    toast({ title: "Exécution…" });
    await supabase.functions.invoke(fn, { body: { targetId } });
    toast({ title: "Terminé" });
    onRefresh();
    // Reload
    const { data } = await supabase.from("sniper_targets" as any).select("*").eq("id", targetId).single();
    setTarget(data);
  }

  if (!target) return (
    <Sheet open={open} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader><SheetTitle>Chargement…</SheetTitle></SheetHeader>
      </SheetContent>
    </Sheet>
  );

  const heat = getHeatLabel(target.heat_score || 0);

  return (
    <Sheet open={open} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {target.business_name}
            <span className={`text-sm ${heat.color}`}>{heat.label}</span>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {/* Identity */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-muted-foreground">Ville</div><div>{target.city || "—"}</div>
            <div className="text-muted-foreground">Catégorie</div><div>{target.category || "—"}</div>
            <div className="text-muted-foreground">Priorité</div><div>{target.sniper_priority_score != null ? Math.round(target.sniper_priority_score) : "—"}/100</div>
            <div className="text-muted-foreground">Heat</div><div>{Math.round(target.heat_score || 0)}</div>
            <div className="text-muted-foreground">Statut</div><div><Badge variant="outline">{target.outreach_status}</Badge></div>
            <div className="text-muted-foreground">Enrichissement</div><div><Badge variant="outline">{target.enrichment_status}</Badge></div>
            <div className="text-muted-foreground">Canal</div><div>{target.recommended_channel || "—"}</div>
            <div className="text-muted-foreground">Founder</div><div>{target.founder_eligible ? "✓ Eligible" : "—"}</div>
          </div>

          {/* Contact */}
          <div className="flex flex-wrap gap-2">
            {target.website_url && (
              <Badge variant="secondary" className="gap-1"><Globe className="w-3 h-3" />{target.domain || target.website_url}</Badge>
            )}
            {target.phone && (
              <Badge variant="secondary" className="gap-1"><Phone className="w-3 h-3" />{target.phone}</Badge>
            )}
            {target.email && (
              <Badge variant="secondary" className="gap-1"><Mail className="w-3 h-3" />{target.email}</Badge>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => runAction("sniper-enrich-target")}>
              <Zap className="w-3 h-3 mr-1" /> Enrichir
            </Button>
            <Button size="sm" variant="outline" onClick={() => runAction("sniper-generate-assets")}>
              <FileText className="w-3 h-3 mr-1" /> Générer
            </Button>
            <Button size="sm" variant="outline" onClick={() => runAction("sniper-queue-send")}>
              <Send className="w-3 h-3 mr-1" /> Envoyer
            </Button>
            <Button size="sm" variant="outline" onClick={() => runAction("sniper-update-heat")}>
              <Flame className="w-3 h-3 mr-1" /> Heat
            </Button>
          </div>

          <Separator />

          {/* Message variants */}
          {variants.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Messages ({variants.length})</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {variants.map((v: any) => (
                  <div key={v.id} className="text-xs border rounded-lg p-2 bg-muted/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px]">{v.channel}</Badge>
                      <Badge variant="outline" className="text-[10px]">{v.variant_type}</Badge>
                      {v.is_selected && <Badge className="text-[10px]">sélectionné</Badge>}
                    </div>
                    {v.subject_line && <div className="font-medium">{v.subject_line}</div>}
                    <div className="text-muted-foreground line-clamp-2">{v.message_body}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Engagement timeline */}
          {events.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Engagement ({events.length})</h4>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {events.map((e: any) => (
                  <div key={e.id} className="flex items-center justify-between text-xs py-1">
                    <Badge variant="outline" className="text-[10px]">{e.event_name}</Badge>
                    <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString("fr-CA")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scores */}
          <Separator />
          <div>
            <h4 className="text-sm font-medium mb-2">Sous-scores</h4>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <span className="text-muted-foreground">Revenu</span><span>{target.revenue_potential_score ?? "—"}</span>
              <span className="text-muted-foreground">Readiness</span><span>{target.readiness_score ?? "—"}</span>
              <span className="text-muted-foreground">Pain/Upside</span><span>{target.pain_upside_score ?? "—"}</span>
              <span className="text-muted-foreground">Stratégique</span><span>{target.strategic_fit_score ?? "—"}</span>
              <span className="text-muted-foreground">Contactabilité</span><span>{target.contactability_score ?? "—"}</span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
