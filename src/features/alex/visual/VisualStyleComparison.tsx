/**
 * VisualStyleComparison — Shows 2 styles side-by-side. User picks one.
 * On selection: stores preference + injects BeforeAfter card.
 */
import { useEffect, useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAlexVisualStore } from "./visualStore";
import { useAlexStore } from "@/features/alex/state/alexStore";
import { useAlexVoice } from "@/features/alex/hooks/useAlexVoice";
import BeforeAfterViewer from "./BeforeAfterViewer";
import { getUserStyleProfile, recommendStyle } from "./SmartRecommendationEngine";
import type { VisualStylesResponse, VisualStyleOption } from "./types";

interface Props {
  actionId: string;
  data: VisualStylesResponse;
}

export default function VisualStyleComparison({ actionId, data }: Props) {
  const [picked, setPicked] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [recommendedId, setRecommendedId] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const pushAction = useAlexVisualStore((s) => s.pushAction);
  const removeAction = useAlexVisualStore((s) => s.removeAction);
  const { speak } = useAlexVoice();

  useEffect(() => {
    let alive = true;
    getUserStyleProfile().then((profile) => {
      if (!alive) return;
      const rec = recommendStyle(data.styles, profile);
      setRecommendedId(rec.recommendedId);
      setReason(rec.reason);
    });
    return () => { alive = false; };
  }, [data.styles]);

  const select = async (opt: VisualStyleOption) => {
    if (saving) return;
    setSaving(true);
    setPicked(opt.id);
    const rejected = data.styles.find((s) => s.id !== opt.id);

    try {
      const { data: u } = await supabase.auth.getUser();
      await supabase.from("user_visual_preferences").insert({
        user_id: u.user?.id ?? null,
        preference_type: "visual_style",
        selected_style: opt.id,
        rejected_style: rejected?.id ?? null,
        project_type: data.project_type,
        source_image_url: data.original_image_url,
        generated_preview_url: opt.after_image_url,
      });
    } catch (e) {
      console.error("save pref", e);
    } finally {
      setSaving(false);
    }

    // Inject before/after viewer + Alex follow-up
    if (opt.after_image_url) {
      pushAction({
        id: `ba-${actionId}`,
        type: "before_after",
        payload: { before: data.original_image_url, after: opt.after_image_url, label: opt.label },
      });
    }

    const followup = `Excellent choix. Pour ce résultat, je chercherais un ${data.recommended_trade} qui maîtrise ce style précis. Voulez-vous que je vous montre les meilleurs disponibles?`;
    useAlexStore.getState().injectAssistantMessage(followup, true);
    await speak(followup);

    removeAction(actionId);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-foreground">{data.intro_text}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {data.styles.map((opt) => {
          const isPicked = picked === opt.id;
          return (
            <button
              key={opt.id}
              disabled={saving}
              onClick={() => select(opt)}
              className={`group text-left rounded-2xl overflow-hidden border-2 transition-all ${
                isPicked ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"
              }`}
            >
              <div className="relative aspect-[4/3] bg-muted">
                {opt.after_image_url ? (
                  <img src={opt.after_image_url} alt={opt.label} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                    Aperçu indisponible
                  </div>
                )}
                {isPicked && (
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                    {saving ? <Loader2 className="w-6 h-6 text-primary animate-spin" /> : <Check className="w-8 h-8 text-primary" />}
                  </div>
                )}
              </div>
              <div className="p-3 space-y-1.5">
                <p className="text-sm font-semibold">{opt.label}</p>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  {opt.bullets.map((b, i) => (
                    <li key={i}>• {b}</li>
                  ))}
                </ul>
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground italic">Aperçus conceptuels non contractuels.</p>
    </div>
  );
}
