import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { clearPhoneticLockCache } from "@/services/alex/brandPhoneticLock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Shield, Volume2, Play, RefreshCw, Lock, AlertTriangle } from "lucide-react";

const TEST_SENTENCES = {
  fr: [
    "Bienvenue sur UNPRO",
    "UNPRO vous aide à trouver le bon professionnel",
    "Avec UNPRO, vous pouvez réserver en 30 secondes",
    "Grâce à UNPRO",
    "Le système UNPRO analyse votre besoin",
  ],
  en: [
    "Welcome to UNPRO",
    "UNPRO helps you find the right professional",
    "With UNPRO, you can book in 30 seconds",
    "Thanks to UNPRO",
    "The UNPRO system analyzes your need",
  ],
};

interface LockRule {
  id: string;
  brand_key: string;
  language_code: string;
  display_text: string;
  speech_text: string;
  phonetic_hint: string | null;
  voice_engine: string | null;
  context_type: string;
  is_forced: boolean;
  is_active: boolean;
  priority: number;
  notes: string | null;
  created_at: string;
}

export default function PanelBrandPhoneticLock() {
  const queryClient = useQueryClient();
  const [testLang, setTestLang] = useState("fr");
  const [testInput, setTestInput] = useState("");
  const [testResult, setTestResult] = useState<{ displayText: string; speechText: string; brandDetected: boolean; ruleApplied: string | null } | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["phonetic-lock-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alex_brand_phonetic_lock")
        .select("*")
        .order("priority", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as LockRule[];
    },
  });

  const { data: events = [] } = useQuery({
    queryKey: ["phonetic-events"],
    queryFn: async () => {
      const { data } = await supabase
        .from("alex_phonetic_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("alex_brand_phonetic_lock")
        .update({ is_active } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phonetic-lock-rules"] });
      clearPhoneticLockCache();
      toast.success("Règle mise à jour");
    },
  });

  const runTest = async (text: string, lang: string) => {
    setTestLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("brand-phonetic-preprocess", {
        body: { text, language: lang },
      });
      if (error) throw error;
      setTestResult(data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setTestLoading(false);
    }
  };

  const frRules = rules.filter(r => r.language_code === "fr" && r.is_active);
  const enRules = rules.filter(r => r.language_code === "en" && r.is_active);

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="font-semibold text-sm">Phonetic Lock Active</p>
              <p className="text-xs text-muted-foreground">
                UNPRO → FR: "{frRules[0]?.speech_text || "un pro"}" | EN: "{enRules[0]?.speech_text || "eun pro"}"
              </p>
            </div>
            <Badge variant="default" className="gap-1">
              <Shield className="h-3 w-3" /> Verrouillé
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="test" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="test" className="flex-1">Test en direct</TabsTrigger>
          <TabsTrigger value="rules" className="flex-1">Règles</TabsTrigger>
          <TabsTrigger value="logs" className="flex-1">Logs</TabsTrigger>
        </TabsList>

        {/* ─── Test Tab ─── */}
        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Volume2 className="h-4 w-4" /> Test de prononciation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Select value={testLang} onValueChange={setTestLang}>
                  <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">FR</SelectItem>
                    <SelectItem value="en">EN</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Tapez une phrase avec UNPRO..."
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  className="flex-1"
                />
                <Button size="sm" onClick={() => runTest(testInput, testLang)} disabled={testLoading || !testInput}>
                  <Play className="h-4 w-4" />
                </Button>
              </div>

              {testResult && (
                <div className="rounded-lg border p-3 space-y-2 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Badge variant={testResult.brandDetected ? "default" : "outline"}>
                      {testResult.brandDetected ? "✅ Marque détectée" : "—"}
                    </Badge>
                    {testResult.ruleApplied && (
                      <Badge variant="secondary" className="text-xs">
                        Règle: {testResult.ruleApplied === "fallback" ? "Fallback" : testResult.ruleApplied.slice(0, 8)}
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">Affiché:</span>
                      <p className="font-mono">{testResult.displayText}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Parlé (TTS):</span>
                      <p className="font-mono font-semibold text-primary">{testResult.speechText}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick test sentences */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Tests rapides :</p>
                <div className="flex flex-wrap gap-1">
                  {(TEST_SENTENCES[testLang as keyof typeof TEST_SENTENCES] || TEST_SENTENCES.fr).map((s, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => { setTestInput(s); runTest(s, testLang); }}
                    >
                      {s.length > 30 ? s.slice(0, 30) + "…" : s}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Anti-spell guard */}
          <Card className="border-destructive/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" /> Anti-Letter Spelling Guard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">Patterns bloqués automatiquement :</p>
              <div className="flex flex-wrap gap-1">
                {["U.N.P.R.O", "YOU-EN PRO", "U.N.", "you en pro"].map((p) => (
                  <Badge key={p} variant="destructive" className="text-xs font-mono">{p}</Badge>
                ))}
              </div>
              <div className="flex flex-wrap gap-1">
                {["U N P R O", "you-en", "You En Pro"].map((p) => (
                  <Badge key={p} variant="outline" className="text-xs font-mono line-through">{p}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Rules Tab ─── */}
        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{rules.length} règle(s)</p>
            <Button variant="outline" size="sm" onClick={() => {
              clearPhoneticLockCache();
              queryClient.invalidateQueries({ queryKey: ["phonetic-lock-rules"] });
              toast.success("Cache vidé");
            }}>
              <RefreshCw className="h-3 w-3 mr-1" /> Vider cache
            </Button>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Langue</TableHead>
                    <TableHead>Forme parlée</TableHead>
                    <TableHead>Contexte</TableHead>
                    <TableHead>Priorité</TableHead>
                    <TableHead>Actif</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <Badge variant="outline">{rule.language_code.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell className="font-mono font-semibold">{rule.speech_text}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">{rule.context_type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{rule.priority}</TableCell>
                      <TableCell>
                        <Switch
                          checked={rule.is_active}
                          onCheckedChange={(checked) => toggleMutation.mutate({ id: rule.id, is_active: checked })}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ─── Logs Tab ─── */}
        <TabsContent value="logs" className="space-y-4">
          <p className="text-sm text-muted-foreground">{events.length} événement(s) récent(s)</p>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Langue</TableHead>
                  <TableHead>Original</TableHead>
                  <TableHead>Transformé</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-6">
                      Aucun événement enregistré
                    </TableCell>
                  </TableRow>
                ) : (
                  events.map((evt: any) => (
                    <TableRow key={evt.id}>
                      <TableCell><Badge variant="outline">{evt.language_code?.toUpperCase()}</Badge></TableCell>
                      <TableCell className="text-xs font-mono max-w-32 truncate">{evt.original_text}</TableCell>
                      <TableCell className="text-xs font-mono font-semibold text-primary max-w-32 truncate">{evt.processed_text}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(evt.created_at).toLocaleString("fr-CA")}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
