import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Image, Activity, CheckCircle2, AlertTriangle, Eye, RefreshCw } from "lucide-react";
import UnproLogo from "@/components/brand/UnproLogo";
import UnproIcon from "@/components/brand/UnproIcon";

function useInvoke<T>(action: string, key: string) {
  return useQuery({
    queryKey: ["brand", key],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("edge-brand-enforce", { body: { action } });
      if (error) throw error;
      return data as T;
    },
  });
}

/* ─── Stats Card ─── */
function StatsSection() {
  const { data, isLoading } = useInvoke<{
    total: number; overrides: number; foreign_detected: number; compliance_rate: number;
  }>("stats", "stats");

  const stats = [
    { label: "Images traitées", value: data?.total ?? 0, icon: Image },
    { label: "Overrides appliqués", value: data?.overrides ?? 0, icon: Shield },
    { label: "Marques tierces détectées", value: data?.foreign_detected ?? 0, icon: AlertTriangle },
    { label: "Taux conformité", value: `${(data?.compliance_rate ?? 100).toFixed(1)}%`, icon: CheckCircle2 },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((s) => (
        <Card key={s.label} className={isLoading ? "animate-pulse" : ""}>
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <s.icon className="w-4 h-4" />
              <span className="text-xs">{s.label}</span>
            </div>
            <span className="text-2xl font-bold font-display">{s.value}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ─── Assets Grid ─── */
function AssetsSection() {
  const { data, isLoading } = useInvoke<{ assets: any[] }>("list_assets", "assets");

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {isLoading && Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="animate-pulse h-40" />
      ))}
      {data?.assets?.map((a: any) => (
        <Card key={a.id}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant={a.theme === "light" ? "default" : "secondary"}>{a.theme}</Badge>
              <Badge variant="outline">{a.asset_type}</Badge>
              {a.is_default && <Badge className="bg-primary/20 text-primary border-primary/30">Défaut</Badge>}
            </div>
            <div className={`rounded-lg p-6 flex items-center justify-center ${a.theme === "dark" ? "bg-background" : "bg-foreground"}`}>
              {a.asset_type === "icon" ? (
                <UnproIcon size={48} variant={a.theme === "light" ? "mono" : "primary"} />
              ) : (
                <UnproLogo size={200} variant={a.theme === "light" ? "mono" : "primary"} animated={false} />
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{a.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ─── Rules Section ─── */
function RulesSection() {
  const { data, isLoading } = useInvoke<{ rules: any[] }>("list_rules", "rules");

  return (
    <div className="space-y-3">
      {isLoading && <Card className="animate-pulse h-24" />}
      {data?.rules?.map((r: any) => (
        <Card key={r.id}>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">{r.rule_name}</span>
              <Badge variant={r.enforce_override ? "default" : "outline"}>
                {r.enforce_override ? "Override forcé" : "Passif"}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <div>📍 {r.placement}</div>
              <div>📐 {(r.size_ratio * 100).toFixed(0)}%</div>
              <div>📏 {r.padding_px}px</div>
            </div>
            {r.blocked_patterns?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {r.blocked_patterns.map((p: string) => (
                  <Badge key={p} variant="destructive" className="text-[10px]">🚫 {p}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ─── Logs Section ─── */
function LogsSection() {
  const { data, isLoading, refetch } = useInvoke<{ logs: any[] }>("list_logs", "logs");

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Rafraîchir
        </Button>
      </div>
      {isLoading && Array.from({ length: 3 }).map((_, i) => <Card key={i} className="animate-pulse h-16" />)}
      {data?.logs?.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Shield className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Aucun log de branding encore.</p>
          </CardContent>
        </Card>
      )}
      {data?.logs?.map((l: any) => (
        <Card key={l.id}>
          <CardContent className="p-3 flex items-center gap-3">
            {l.override_applied ? (
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{l.image_ref ?? "Image sans ref"}</p>
              {l.previous_brand_detected && (
                <p className="text-[11px] text-destructive">Marque détectée: {l.previous_brand_detected}</p>
              )}
            </div>
            <Badge variant="outline" className="text-[10px] shrink-0">{l.channel}</Badge>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {new Date(l.created_at).toLocaleDateString("fr-CA")}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ─── Preview Widget ─── */
function PreviewWidget() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [testText, setTestText] = useState("Powered by Lovable");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runTest = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke("edge-brand-enforce", {
        body: { action: "enforce", text_content: testText, theme, image_ref: "test-preview", channel: "preview" },
      });
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2"><Eye className="w-4 h-4" /> Test d'enforcement</CardTitle>
        <CardDescription>Simuler le branding sur un contenu</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <input
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          placeholder="Texte à vérifier..."
        />
        <div className="flex gap-2">
          <Button size="sm" variant={theme === "light" ? "default" : "outline"} onClick={() => setTheme("light")}>
            Light
          </Button>
          <Button size="sm" variant={theme === "dark" ? "default" : "outline"} onClick={() => setTheme("dark")}>
            Dark
          </Button>
          <Button size="sm" onClick={runTest} disabled={loading} className="ml-auto">
            {loading ? "..." : "Tester"}
          </Button>
        </div>
        {result && (
          <div className="rounded-xl border p-4 space-y-2">
            <div className="flex items-center gap-2">
              {result.override_applied ? (
                <Badge variant="destructive">Override appliqué</Badge>
              ) : (
                <Badge className="bg-primary/20 text-primary">Conforme</Badge>
              )}
              {result.previous_brand_detected && (
                <Badge variant="outline">Détecté: {result.previous_brand_detected}</Badge>
              )}
            </div>
            <div className={`rounded-lg p-6 relative ${theme === "dark" ? "bg-foreground" : "bg-background border"}`}>
              <div className="absolute" style={{
                [result.placement?.position?.includes("right") ? "right" : "left"]: result.placement?.padding_px ?? 12,
                top: result.placement?.padding_px ?? 12,
              }}>
                <UnproLogo
                  size={160}
                  variant={theme === "light" ? "primary" : "mono"}
                  animated={false}
                />
              </div>
              <div className="pt-16 text-center">
                <p className={`text-xs ${theme === "dark" ? "text-background" : "text-foreground"}`}>
                  Aperçu SMS Card
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Main Page ─── */
export default function PageAdminBrandSettings() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-display font-bold flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" /> Brand Identity Engine
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Contrôle du branding UNPRO sur toutes les images SMS/RCS
        </p>
      </div>

      <StatsSection />

      <Tabs defaultValue="assets">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="rules">Règles</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>
        <TabsContent value="assets" className="mt-4"><AssetsSection /></TabsContent>
        <TabsContent value="rules" className="mt-4"><RulesSection /></TabsContent>
        <TabsContent value="preview" className="mt-4"><PreviewWidget /></TabsContent>
        <TabsContent value="logs" className="mt-4"><LogsSection /></TabsContent>
      </Tabs>
    </div>
  );
}
