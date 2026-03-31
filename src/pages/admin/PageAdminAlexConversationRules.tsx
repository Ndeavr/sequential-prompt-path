/**
 * PageAdminAlexConversationRules — Admin dashboard for Alex guardrails,
 * blocked patterns, response settings, and live preview.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Sliders, AlertTriangle, Eye, Check, X, RefreshCw, Bot, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  runResponsePipeline,
  type AlexResponseSettings,
  type ConversationRule,
  type BlockedPattern,
} from "@/services/alex/alexResponseEngine";

export default function PageAdminAlexConversationRules() {
  const queryClient = useQueryClient();
  const [previewInput, setPreviewInput] = useState(
    "Selon les données, voici l'extrait du document: le tableau suivant montre que UNPRO a 15 entrepreneurs dans la catégorie plomberie. En conclusion, il est important de noter que les résultats sont prometteurs."
  );

  // ─── Queries ────────────────────────────────────────────────────
  const settingsQuery = useQuery({
    queryKey: ["alex-response-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alex_response_settings")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data as unknown as AlexResponseSettings & { id: string };
    },
  });

  const rulesQuery = useQuery({
    queryKey: ["alex-conversation-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alex_conversation_rules")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data as unknown as ConversationRule[];
    },
  });

  const patternsQuery = useQuery({
    queryKey: ["alex-blocked-patterns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alex_blocked_patterns")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data as unknown as BlockedPattern[];
    },
  });

  const logsQuery = useQuery({
    queryKey: ["alex-response-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alex_response_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  // ─── Mutations ──────────────────────────────────────────────────
  const updateSettingsMut = useMutation({
    mutationFn: async (updates: Partial<AlexResponseSettings>) => {
      const id = (settingsQuery.data as any)?.id;
      if (!id) throw new Error("No settings found");
      const { error } = await supabase
        .from("alex_response_settings")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Paramètres mis à jour");
      queryClient.invalidateQueries({ queryKey: ["alex-response-settings"] });
    },
  });

  const toggleRuleMut = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("alex_conversation_rules")
        .update({ is_active } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alex-conversation-rules"] });
    },
  });

  const togglePatternMut = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("alex_blocked_patterns")
        .update({ is_active } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alex-blocked-patterns"] });
    },
  });

  // ─── Preview ────────────────────────────────────────────────────
  const previewResult =
    settingsQuery.data && rulesQuery.data && patternsQuery.data
      ? runResponsePipeline(
          previewInput,
          settingsQuery.data,
          rulesQuery.data,
          patternsQuery.data,
          "fr"
        )
      : null;

  const settings = settingsQuery.data;

  return (
    <div className="min-h-screen bg-background px-4 py-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Garde-fous Alex</h1>
          <p className="text-xs text-muted-foreground">Contrôle du ton, style et qualité des réponses</p>
        </div>
      </div>

      <Tabs defaultValue="settings">
        <TabsList className="w-full">
          <TabsTrigger value="settings" className="flex-1 text-xs">
            <Sliders className="w-3 h-3 mr-1" />
            Réglages
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex-1 text-xs">
            <Shield className="w-3 h-3 mr-1" />
            Règles
          </TabsTrigger>
          <TabsTrigger value="patterns" className="flex-1 text-xs">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Patterns
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex-1 text-xs">
            <Eye className="w-3 h-3 mr-1" />
            Preview
          </TabsTrigger>
        </TabsList>

        {/* Settings */}
        <TabsContent value="settings" className="space-y-4 mt-4">
          {settings && (
            <>
              <SettingSlider
                label="Chaleur"
                value={settings.warmth_level}
                onChange={(v) => updateSettingsMut.mutate({ warmth_level: v })}
                icon="🔥"
              />
              <SettingSlider
                label="Directivité"
                value={settings.directness_level}
                onChange={(v) => updateSettingsMut.mutate({ directness_level: v })}
                icon="🎯"
              />
              <SettingSlider
                label="Longueur max"
                value={settings.max_response_length}
                onChange={(v) => updateSettingsMut.mutate({ max_response_length: v })}
                min={100}
                max={600}
                step={20}
                icon="📏"
                suffix=" car."
              />
              <SettingToggle
                label="Réécriture naturelle"
                checked={settings.rewrite_enabled}
                onChange={(v) => updateSettingsMut.mutate({ rewrite_enabled: v })}
              />
              <SettingToggle
                label="Blocage style NotebookLM"
                checked={settings.notebook_style_block_enabled}
                onChange={(v) => updateSettingsMut.mutate({ notebook_style_block_enabled: v })}
              />
              <SettingToggle
                label="Override prononciation"
                checked={settings.pronunciation_override_enabled}
                onChange={(v) => updateSettingsMut.mutate({ pronunciation_override_enabled: v })}
              />
            </>
          )}
        </TabsContent>

        {/* Rules */}
        <TabsContent value="rules" className="space-y-2 mt-4">
          {rulesQuery.data?.map((rule) => (
            <div key={rule.id} className="glass-card rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">{rule.rule_label}</p>
                <p className="text-[10px] text-muted-foreground truncate">{rule.rule_description}</p>
                <span className={cn(
                  "inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded-full font-medium",
                  rule.severity === "block" ? "bg-destructive/10 text-destructive" :
                  rule.severity === "rewrite" ? "bg-amber-500/10 text-amber-500" :
                  "bg-blue-500/10 text-blue-500"
                )}>
                  {rule.severity}
                </span>
              </div>
              <Switch
                checked={rule.is_active}
                onCheckedChange={(v) => toggleRuleMut.mutate({ id: rule.id, is_active: v })}
              />
            </div>
          ))}
        </TabsContent>

        {/* Blocked Patterns */}
        <TabsContent value="patterns" className="space-y-2 mt-4">
          {patternsQuery.data?.map((pattern) => (
            <div key={pattern.id} className="glass-card rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono text-foreground truncate">
                  {pattern.pattern_type === "regex" ? `/${pattern.pattern_text}/` : `"${pattern.pattern_text}"`}
                </p>
                <div className="flex gap-2 mt-1">
                  <span className={cn(
                    "text-[9px] px-1.5 py-0.5 rounded-full font-medium",
                    pattern.severity === "block" ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-500"
                  )}>
                    {pattern.severity}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                    {pattern.replacement_strategy}
                  </span>
                </div>
              </div>
              <Switch
                checked={pattern.is_active}
                onCheckedChange={(v) => togglePatternMut.mutate({ id: pattern.id, is_active: v })}
              />
            </div>
          ))}
        </TabsContent>

        {/* Preview */}
        <TabsContent value="preview" className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">Texte d'entrée (simulé)</label>
            <textarea
              value={previewInput}
              onChange={(e) => setPreviewInput(e.target.value)}
              rows={4}
              className="w-full rounded-xl bg-card border border-border/40 p-3 text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {previewResult && (
            <div className="space-y-3">
              {/* Status badge */}
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-[10px] px-2 py-1 rounded-full font-bold",
                  previewResult.finalStatus === "delivered" ? "bg-green-500/10 text-green-500" :
                  previewResult.finalStatus === "rewritten" ? "bg-amber-500/10 text-amber-500" :
                  "bg-destructive/10 text-destructive"
                )}>
                  {previewResult.finalStatus.toUpperCase()}
                </span>
                {previewResult.pronunciationApplied && (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                    <Mic className="w-2.5 h-2.5 inline mr-0.5" />
                    Prononciation appliquée
                  </span>
                )}
              </div>

              {/* Blocked patterns */}
              {previewResult.blockedPatternsDetected.length > 0 && (
                <div className="glass-card rounded-xl p-3 border-destructive/20">
                  <p className="text-[10px] font-semibold text-destructive mb-1">
                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                    Patterns détectés ({previewResult.blockedPatternsDetected.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {previewResult.blockedPatternsDetected.map((p, i) => (
                      <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-mono">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw vs Rewritten */}
              <div className="grid gap-3">
                <div className="glass-card rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1">Brut</p>
                  <p className="text-xs text-foreground/60 line-through">{previewResult.rawResponse}</p>
                </div>
                <div className="glass-card rounded-xl p-3 border-green-500/20">
                  <p className="text-[10px] font-semibold text-green-500 mb-1">
                    <Check className="w-3 h-3 inline mr-1" />
                    Après pipeline
                  </p>
                  <p className="text-xs text-foreground">{previewResult.rewrittenResponse}</p>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Recent logs */}
      {logsQuery.data && logsQuery.data.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
            Dernières réponses
          </h2>
          {logsQuery.data.slice(0, 5).map((log: any) => (
            <div key={log.id} className="glass-card rounded-xl p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded-full font-bold",
                  log.final_status === "delivered" ? "bg-green-500/10 text-green-500" :
                  log.final_status === "rewritten" ? "bg-amber-500/10 text-amber-500" :
                  "bg-destructive/10 text-destructive"
                )}>
                  {log.final_status}
                </span>
                <span className="text-[9px] text-muted-foreground">{log.response_time_ms}ms</span>
              </div>
              <p className="text-[11px] text-foreground line-clamp-2">
                {log.rewritten_response || log.raw_response}
              </p>
              {log.blocked_patterns_detected?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {log.blocked_patterns_detected.map((p: string, i: number) => (
                    <span key={i} className="text-[8px] px-1 py-0.5 rounded bg-destructive/10 text-destructive">
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────
function SettingSlider({
  label, value, onChange, icon, min = 1, max = 10, step = 1, suffix = "",
}: {
  label: string; value: number; onChange: (v: number) => void;
  icon: string; min?: number; max?: number; step?: number; suffix?: string;
}) {
  return (
    <div className="glass-card rounded-xl p-3 space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{icon} {label}</span>
        <span className="font-bold text-foreground">{value}{suffix}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        className="py-1"
      />
    </div>
  );
}

function SettingToggle({
  label, checked, onChange,
}: {
  label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="glass-card rounded-xl p-3 flex items-center justify-between">
      <span className="text-xs text-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
