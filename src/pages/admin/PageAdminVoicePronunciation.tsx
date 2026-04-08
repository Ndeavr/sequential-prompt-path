import { useState } from "react";
import PanelBrandPhoneticLock from "@/components/admin/PanelBrandPhoneticLock";
import PanelVoiceToneControl from "@/components/admin/PanelVoiceToneControl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { clearPronunciationCache } from "@/services/alexPronunciationRulesService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, RefreshCw, Volume2, Pencil, Trash2 } from "lucide-react";

const RULE_TYPES = ["brand", "product", "correction", "phonetic_override", "technical"] as const;
const LOCALES = ["fr-CA", "en-CA", "global"] as const;

type RuleType = (typeof RULE_TYPES)[number];

interface PronunciationRule {
  id: string;
  rule_name: string | null;
  source_text: string;
  replacement_text: string;
  phonetic_override: string | null;
  locale: string;
  rule_type: string;
  priority: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

function getRuleTypeBadgeVariant(type: string) {
  switch (type) {
    case "brand": return "default";
    case "product": return "secondary";
    case "technical": return "outline";
    case "correction": return "destructive";
    default: return "outline";
  }
}

export default function PageAdminVoicePronunciation() {
  const queryClient = useQueryClient();
  const [filterLocale, setFilterLocale] = useState<string>("fr-CA");
  const [editingRule, setEditingRule] = useState<PronunciationRule | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [testInput, setTestInput] = useState("");
  const [testResult, setTestResult] = useState<{ original: string; transformed: string } | null>(null);
  const [testLocale, setTestLocale] = useState("fr-CA");

  // Fetch rules
  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["pronunciation-rules", filterLocale],
    queryFn: async () => {
      const query = supabase
        .from("alex_voice_pronunciation_rules")
        .select("*")
        .order("priority", { ascending: false });

      if (filterLocale !== "all") {
        query.or(`locale.eq.${filterLocale},locale.eq.global`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as PronunciationRule[];
    },
  });

  // Toggle active
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("alex_voice_pronunciation_rules")
        .update({ is_active } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pronunciation-rules"] });
      clearPronunciationCache();
      toast.success("Règle mise à jour");
    },
  });

  // Delete rule
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("alex_voice_pronunciation_rules")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pronunciation-rules"] });
      clearPronunciationCache();
      toast.success("Règle supprimée");
    },
  });

  // Test pronunciation
  const handleTest = async () => {
    if (!testInput.trim()) return;
    try {
      const response = await supabase.functions.invoke("alex-pronunciation-rules", {
        body: { action: "apply", text: testInput, locale: testLocale },
      });
      if (response.error) throw response.error;
      setTestResult(response.data);
    } catch (e) {
      toast.error("Erreur lors du test");
    }
  };

  // Test TTS playback
  const handleTestAudio = async (text: string) => {
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("TTS failed");
      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      await audio.play();
    } catch {
      toast.error("Erreur audio — vérifiez la clé ElevenLabs");
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
      {/* Brand Phonetic Lock — Top Priority */}
      <PanelBrandPhoneticLock />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Prononciation Alex</h1>
          <p className="text-sm text-muted-foreground">Règles de prononciation pour le pipeline vocal</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            clearPronunciationCache();
            queryClient.invalidateQueries({ queryKey: ["pronunciation-rules"] });
            toast.success("Cache vidé");
          }}>
            <RefreshCw className="h-4 w-4 mr-1" /> Rafraîchir
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Ajouter règle</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvelle règle de prononciation</DialogTitle>
              </DialogHeader>
              <RuleForm
                onSave={() => {
                  setIsCreateOpen(false);
                  queryClient.invalidateQueries({ queryKey: ["pronunciation-rules"] });
                  clearPronunciationCache();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Test Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tester la prononciation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Entrez un texte à tester..."
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              className="flex-1"
            />
            <Select value={testLocale} onValueChange={setTestLocale}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCALES.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleTest}>Tester</Button>
          </div>
          {testResult && (
            <div className="rounded-lg border p-3 space-y-2 bg-muted/30">
              <div className="text-sm">
                <span className="text-muted-foreground">Original:</span>{" "}
                <span className="font-mono">{testResult.original}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Transformé:</span>{" "}
                <span className="font-mono font-semibold text-primary">{testResult.transformed}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleTestAudio(testResult.original)}>
                  <Volume2 className="h-3 w-3 mr-1" /> Original
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleTestAudio(testResult.transformed)}>
                  <Volume2 className="h-3 w-3 mr-1" /> Corrigé
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex gap-2 items-center">
        <span className="text-sm text-muted-foreground">Langue:</span>
        {["fr-CA", "en-CA", "all"].map((l) => (
          <Button
            key={l}
            variant={filterLocale === l ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterLocale(l)}
          >
            {l === "all" ? "Toutes" : l}
          </Button>
        ))}
        <span className="ml-auto text-sm text-muted-foreground">{rules.length} règle(s)</span>
      </div>

      {/* Rules Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Actif</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Remplacement</TableHead>
                <TableHead>Phonétique</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Locale</TableHead>
                <TableHead>Priorité</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : rules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Aucune règle trouvée
                  </TableCell>
                </TableRow>
              ) : (
                rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={(checked) =>
                          toggleMutation.mutate({ id: rule.id, is_active: checked })
                        }
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm">{rule.source_text}</TableCell>
                    <TableCell className="font-mono text-sm text-primary">{rule.replacement_text}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {rule.phonetic_override || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRuleTypeBadgeVariant(rule.rule_type) as any}>
                        {rule.rule_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{rule.locale}</Badge>
                    </TableCell>
                    <TableCell className="text-center">{rule.priority}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleTestAudio(rule.replacement_text)}
                        >
                          <Volume2 className="h-3 w-3" />
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setEditingRule(rule)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Modifier la règle</DialogTitle>
                            </DialogHeader>
                            {editingRule && (
                              <RuleForm
                                initialData={editingRule}
                                onSave={() => {
                                  setEditingRule(null);
                                  queryClient.invalidateQueries({ queryKey: ["pronunciation-rules"] });
                                  clearPronunciationCache();
                                }}
                              />
                            )}
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Supprimer cette règle ?")) {
                              deleteMutation.mutate(rule.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Rule Create/Edit Form ──

function RuleForm({
  initialData,
  onSave,
}: {
  initialData?: PronunciationRule;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    rule_name: initialData?.rule_name || "",
    source_text: initialData?.source_text || "",
    replacement_text: initialData?.replacement_text || "",
    phonetic_override: initialData?.phonetic_override || "",
    locale: initialData?.locale || "fr-CA",
    rule_type: initialData?.rule_type || "correction",
    priority: initialData?.priority || 100,
    notes: initialData?.notes || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.source_text || !formData.replacement_text) {
      toast.error("Source et remplacement requis");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        phonetic_override: formData.phonetic_override || null,
        notes: formData.notes || null,
      };

      if (initialData) {
        const { error } = await supabase
          .from("alex_voice_pronunciation_rules")
          .update(payload as any)
          .eq("id", initialData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("alex_voice_pronunciation_rules")
          .insert(payload as any);
        if (error) throw error;
      }

      toast.success(initialData ? "Règle modifiée" : "Règle créée");
      onSave();
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        placeholder="Nom de la règle"
        value={formData.rule_name}
        onChange={(e) => setFormData((d) => ({ ...d, rule_name: e.target.value }))}
      />
      <Input
        placeholder="Texte source (ex: UNPRO)"
        value={formData.source_text}
        onChange={(e) => setFormData((d) => ({ ...d, source_text: e.target.value }))}
        required
      />
      <Input
        placeholder="Remplacement (ex: un pro)"
        value={formData.replacement_text}
        onChange={(e) => setFormData((d) => ({ ...d, replacement_text: e.target.value }))}
        required
      />
      <Input
        placeholder="Override phonétique (optionnel)"
        value={formData.phonetic_override}
        onChange={(e) => setFormData((d) => ({ ...d, phonetic_override: e.target.value }))}
      />
      <div className="flex gap-2">
        <Select
          value={formData.locale}
          onValueChange={(v) => setFormData((d) => ({ ...d, locale: v }))}
        >
          <SelectTrigger className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LOCALES.map((l) => (
              <SelectItem key={l} value={l}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={formData.rule_type}
          onValueChange={(v) => setFormData((d) => ({ ...d, rule_type: v }))}
        >
          <SelectTrigger className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RULE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Input
        type="number"
        placeholder="Priorité (plus haut = appliqué en premier)"
        value={formData.priority}
        onChange={(e) => setFormData((d) => ({ ...d, priority: parseInt(e.target.value) || 100 }))}
      />
      <Textarea
        placeholder="Notes (optionnel)"
        value={formData.notes}
        onChange={(e) => setFormData((d) => ({ ...d, notes: e.target.value }))}
        rows={2}
      />
      <Button type="submit" disabled={saving} className="w-full">
        {saving ? "Enregistrement..." : initialData ? "Modifier" : "Créer"}
      </Button>
    </form>
  );
}
