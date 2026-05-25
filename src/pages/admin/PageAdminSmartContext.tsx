/**
 * /admin/smart-context — live editor for Smart Context overrides.
 * Lets ops/admins refine the copy (what/why/moneyImpact/alexScript) per registry entry
 * without redeploying. Stored in `smart_context_overrides`.
 */
import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles, Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { SMART_CONTEXT_REGISTRY } from "@/features/smartContext/registry";
import {
  listAllSurfaces,
  listSurfaceFields,
  type SmartSurface,
} from "@/features/smartContext/recommendationsBySurface";
import type { SmartContextEntry } from "@/features/smartContext/types";

interface OverrideRow {
  field_id: string;
  payload: Partial<SmartContextEntry>;
  active: boolean;
}

type EditableFields = "label" | "what" | "why" | "moneyImpact" | "alexScript";

const EDITABLE: { key: EditableFields; label: string; long?: boolean }[] = [
  { key: "label", label: "Label" },
  { key: "what", label: "What" },
  { key: "why", label: "Why", long: true },
  { key: "moneyImpact", label: "Money impact", long: true },
  { key: "alexScript", label: "Alex script", long: true },
];

function FieldEditor({ fieldId }: { fieldId: string }) {
  const qc = useQueryClient();
  const base = SMART_CONTEXT_REGISTRY[fieldId];

  const { data: override } = useQuery<OverrideRow | null>({
    queryKey: ["sc-override", fieldId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("smart_context_overrides")
        .select("field_id, payload, active")
        .eq("field_id", fieldId)
        .maybeSingle();
      return (data as OverrideRow | null) ?? null;
    },
  });

  const merged = useMemo<Partial<SmartContextEntry>>(
    () => ({ ...base, ...(override?.payload ?? {}) }),
    [base, override],
  );

  const [draft, setDraft] = useState<Partial<SmartContextEntry>>({});
  const [active, setActive] = useState<boolean>(override?.active ?? true);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...(override?.payload ?? {}), ...draft };
      const { error } = await (supabase as any)
        .from("smart_context_overrides")
        .upsert(
          { field_id: fieldId, payload, active },
          { onConflict: "field_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sc-override", fieldId] });
      qc.invalidateQueries({ queryKey: ["smart-context-override", fieldId] });
      toast.success("Override sauvegardé.");
      setDraft({});
    },
    onError: (e: any) => toast.error(e?.message ?? "Sauvegarde impossible."),
  });

  const reset = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("smart_context_overrides")
        .delete()
        .eq("field_id", fieldId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sc-override", fieldId] });
      qc.invalidateQueries({ queryKey: ["smart-context-override", fieldId] });
      toast.success("Reset effectué.");
      setDraft({});
    },
  });

  if (!base) return null;

  return (
    <div className="rounded-2xl border border-border/40 bg-card/60 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-0.5">
          <p className="text-[10px] font-mono text-muted-foreground">{fieldId}</p>
          <p className="text-sm font-semibold text-foreground">{merged.label}</p>
        </div>
        <div className="flex items-center gap-2">
          {override && <Badge variant="outline" className="text-[10px]">Override actif</Badge>}
          <Switch checked={active} onCheckedChange={setActive} />
        </div>
      </div>

      {EDITABLE.map(({ key, label, long }) => {
        const current = (draft[key] as string | undefined) ?? (merged[key] as string | undefined) ?? "";
        return (
          <div key={key} className="space-y-1">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</Label>
            {long ? (
              <Textarea
                value={current}
                rows={2}
                onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                className="text-xs"
              />
            ) : (
              <Input
                value={current}
                onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                className="text-xs h-8"
              />
            )}
          </div>
        );
      })}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button size="sm" variant="ghost" onClick={() => reset.mutate()} disabled={reset.isPending}>
          <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
        </Button>
        <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
          <Save className="h-3.5 w-3.5 mr-1" /> Sauvegarder
        </Button>
      </div>
    </div>
  );
}

export default function PageAdminSmartContext() {
  const surfaces = listAllSurfaces();
  const [activeSurface, setActiveSurface] = useState<SmartSurface>(surfaces[0]);

  const fields = listSurfaceFields(activeSurface);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Smart Context — Admin · UNPRO</title>
      </Helmet>

      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-foreground text-background p-2">
              <Sparkles className="h-4 w-4" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              UNPRO Intelligence · Admin
            </p>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Smart Context — éditeur live</h1>
          <p className="text-sm text-muted-foreground">
            Éditez la copy contextuelle (what / why / money impact / Alex) sans redéployer.
            Les overrides s'appliquent en temps réel sur toutes les surfaces.
          </p>
        </header>

        <Tabs value={activeSurface} onValueChange={(v) => setActiveSurface(v as SmartSurface)}>
          <TabsList className="rounded-2xl">
            {surfaces.map((s) => (
              <TabsTrigger key={s} value={s} className="capitalize rounded-xl text-xs">
                {s}
              </TabsTrigger>
            ))}
          </TabsList>

          {surfaces.map((s) => (
            <TabsContent key={s} value={s} className="space-y-3 pt-4">
              {fields.length === 0 && (
                <p className="text-xs text-muted-foreground">Aucun champ enregistré pour cette surface.</p>
              )}
              {s === activeSurface &&
                fields.map((id) => <FieldEditor key={id} fieldId={id} />)}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
