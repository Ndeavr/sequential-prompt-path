/**
 * PageAlexPromptRulesAdmin — Admin page to manage Alex system prompt rules,
 * pronunciation dictionary, and forbidden outputs.
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Plus, Save, Trash2, Settings2, ShieldAlert, Mic } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PromptRule {
  id: string;
  rule_key: string;
  rule_label: string;
  rule_type: string;
  rule_text: string;
  is_active: boolean;
  priority_order: number;
}

const RULE_TYPES = ["system", "voice", "safety", "booking", "language", "forbidden_output"];

export default function PageAlexPromptRulesAdmin() {
  const [rules, setRules] = useState<PromptRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadRules();
  }, []);

  async function loadRules() {
    setLoading(true);
    const { data } = await supabase
      .from("alex_prompt_rules")
      .select("*")
      .order("priority_order", { ascending: true });
    setRules((data as any[]) || []);
    setLoading(false);
  }

  async function addRule() {
    const newRule = {
      rule_key: `rule_${Date.now()}`,
      rule_label: "Nouvelle règle",
      rule_type: "system",
      rule_text: "",
      is_active: true,
      priority_order: rules.length,
    };
    const { data, error } = await supabase
      .from("alex_prompt_rules")
      .insert(newRule)
      .select()
      .single();
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
      return;
    }
    setRules([...rules, data as any]);
    setEditingId((data as any).id);
  }

  async function saveRule(rule: PromptRule) {
    const { error } = await supabase
      .from("alex_prompt_rules")
      .update({
        rule_key: rule.rule_key,
        rule_label: rule.rule_label,
        rule_type: rule.rule_type,
        rule_text: rule.rule_text,
        is_active: rule.is_active,
        priority_order: rule.priority_order,
      })
      .eq("id", rule.id);

    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    } else {
      toast({ title: "Sauvegardé" });
      setEditingId(null);
    }
  }

  async function deleteRule(id: string) {
    await supabase.from("alex_prompt_rules").delete().eq("id", id);
    setRules(rules.filter((r) => r.id !== id));
    toast({ title: "Règle supprimée" });
  }

  function updateRule(id: string, field: string, value: any) {
    setRules(rules.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  const typeIcon = (type: string) => {
    switch (type) {
      case "safety": return <ShieldAlert className="h-3 w-3" />;
      case "voice": return <Mic className="h-3 w-3" />;
      default: return <Settings2 className="h-3 w-3" />;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Règles Alex — Administration</h1>
          <p className="text-sm text-muted-foreground">
            Gérez les règles système, voix, sécurité et booking d'Alex.
          </p>
        </div>
        <Button onClick={addRule} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Ajouter
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement...</div>
      ) : rules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucune règle configurée. Cliquez sur "Ajouter" pour commencer.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => {
            const isEditing = editingId === rule.id;
            return (
              <Card key={rule.id} className={`${!rule.is_active ? "opacity-60" : ""}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <Input
                          value={rule.rule_label}
                          onChange={(e) => updateRule(rule.id, "rule_label", e.target.value)}
                          className="h-8 text-sm w-48"
                        />
                      ) : (
                        <CardTitle className="text-sm">{rule.rule_label}</CardTitle>
                      )}
                      <Badge variant="outline" className="text-[10px] gap-1">
                        {typeIcon(rule.rule_type)}
                        {rule.rule_type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={(v) => {
                          updateRule(rule.id, "is_active", v);
                          saveRule({ ...rule, is_active: v });
                        }}
                      />
                      {isEditing ? (
                        <Button size="sm" variant="default" onClick={() => saveRule(rule)}>
                          <Save className="h-3 w-3 mr-1" /> Sauvegarder
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setEditingId(rule.id)}>
                          Modifier
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => deleteRule(rule.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {isEditing && (
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Clé</label>
                        <Input
                          value={rule.rule_key}
                          onChange={(e) => updateRule(rule.id, "rule_key", e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Type</label>
                        <select
                          value={rule.rule_type}
                          onChange={(e) => updateRule(rule.id, "rule_type", e.target.value)}
                          className="w-full h-8 text-sm rounded-md border bg-background px-2"
                        >
                          {RULE_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Texte de la règle</label>
                      <Textarea
                        value={rule.rule_text}
                        onChange={(e) => updateRule(rule.id, "rule_text", e.target.value)}
                        rows={4}
                        className="text-sm"
                      />
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
