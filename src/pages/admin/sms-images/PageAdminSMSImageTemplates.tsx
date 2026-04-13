import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Image, Plus, Trash2, Eye, BarChart3, Clock, MousePointerClick,
  Smartphone, ArrowLeft, Search, Loader2, AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Template {
  id: string;
  name: string;
  service_slug: string | null;
  city_slug: string | null;
  user_type: string;
  image_url: string | null;
  title_text: string | null;
  subtitle_text: string | null;
  cta_text: string | null;
  is_active: boolean;
  created_at: string;
}

interface Rule {
  id: string;
  priority: number;
  service_match: string | null;
  city_match: string | null;
  user_type_match: string | null;
  intent_match: string | null;
  template_id: string | null;
  fallback_type: string;
  is_active: boolean;
  template?: { id: string; name: string } | null;
}

interface LogEntry {
  id: string;
  template_name: string | null;
  fallback_used: boolean;
  fallback_type: string | null;
  click: boolean;
  service_slug: string | null;
  city_slug: string | null;
  created_at: string;
}

export default function PageAdminSMSImageTemplates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newTpl, setNewTpl] = useState({ name: "", service_slug: "", city_slug: "", title_text: "", subtitle_text: "", cta_text: "Voir mon estimation →", image_url: "" });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [t, r, l] = await Promise.all([
        supabase.functions.invoke("edge-generate-sms-image", { body: { action: "list_templates" } }),
        supabase.functions.invoke("edge-generate-sms-image", { body: { action: "list_rules" } }),
        supabase.functions.invoke("edge-generate-sms-image", { body: { action: "list_logs", limit: 200 } }),
      ]);
      setTemplates(t.data?.templates ?? []);
      setRules(r.data?.rules ?? []);
      setLogs(l.data?.logs ?? []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }

  async function createTemplate() {
    const tpl: any = { name: newTpl.name, title_text: newTpl.title_text, cta_text: newTpl.cta_text };
    if (newTpl.service_slug) tpl.service_slug = newTpl.service_slug;
    if (newTpl.city_slug) tpl.city_slug = newTpl.city_slug;
    if (newTpl.subtitle_text) tpl.subtitle_text = newTpl.subtitle_text;
    if (newTpl.image_url) tpl.image_url = newTpl.image_url;
    const { error } = await supabase.functions.invoke("edge-generate-sms-image", { body: { action: "create_template", template: tpl } });
    if (error) { toast.error("Erreur création"); return; }
    toast.success("Template créé");
    setShowCreate(false);
    setNewTpl({ name: "", service_slug: "", city_slug: "", title_text: "", subtitle_text: "", cta_text: "Voir mon estimation →", image_url: "" });
    loadAll();
  }

  async function deleteTemplate(id: string) {
    await supabase.functions.invoke("edge-generate-sms-image", { body: { action: "delete_template", id } });
    toast.info("Template supprimé");
    loadAll();
  }

  async function testMatch(serviceSlug: string, citySlug: string) {
    const { data } = await supabase.functions.invoke("edge-generate-sms-image", {
      body: { action: "match", service_slug: serviceSlug, city_slug: citySlug, user_type: "homeowner" },
    });
    if (data?.template) {
      toast.success(`Match: ${data.template.name ?? "auto"} (${data.match_type})${data.fallback ? " [fallback]" : ""}`);
    }
  }

  const filtered = templates.filter((t) => !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.service_slug?.includes(search) || t.city_slug?.includes(search));

  const totalLogs = logs.length;
  const clickCount = logs.filter((l) => l.click).length;
  const fallbackCount = logs.filter((l) => l.fallback_used).length;
  const ctr = totalLogs > 0 ? ((clickCount / totalLogs) * 100).toFixed(1) : "0";

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-xl font-bold font-display">Images SMS dynamiques</h1>
          <p className="text-sm text-muted-foreground">Personnalisation par service × ville</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Image} label="Templates" value={templates.length} />
        <StatCard icon={BarChart3} label="CTR" value={`${ctr}%`} />
        <StatCard icon={MousePointerClick} label="Clics" value={clickCount} />
        <StatCard icon={AlertTriangle} label="Fallbacks" value={`${totalLogs > 0 ? ((fallbackCount / totalLogs) * 100).toFixed(0) : 0}%`} />
      </div>

      <Tabs defaultValue="templates">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="rules">Règles</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        {/* ─── Templates ─── */}
        <TabsContent value="templates" className="space-y-4 mt-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button size="sm" onClick={() => setShowCreate(!showCreate)}><Plus className="h-4 w-4 mr-1" /> Nouveau</Button>
          </div>

          {showCreate && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Nom</Label><Input value={newTpl.name} onChange={(e) => setNewTpl({ ...newTpl, name: e.target.value })} placeholder="Toiture Laval" /></div>
                  <div><Label>Service slug</Label><Input value={newTpl.service_slug} onChange={(e) => setNewTpl({ ...newTpl, service_slug: e.target.value })} placeholder="toiture" /></div>
                  <div><Label>Ville slug</Label><Input value={newTpl.city_slug} onChange={(e) => setNewTpl({ ...newTpl, city_slug: e.target.value })} placeholder="laval" /></div>
                  <div><Label>Image URL</Label><Input value={newTpl.image_url} onChange={(e) => setNewTpl({ ...newTpl, image_url: e.target.value })} placeholder="https://…" /></div>
                </div>
                <div><Label>Titre</Label><Input value={newTpl.title_text} onChange={(e) => setNewTpl({ ...newTpl, title_text: e.target.value })} placeholder="Besoin d'un couvreur?" /></div>
                <div><Label>Sous-titre</Label><Input value={newTpl.subtitle_text} onChange={(e) => setNewTpl({ ...newTpl, subtitle_text: e.target.value })} /></div>
                <div><Label>CTA</Label><Input value={newTpl.cta_text} onChange={(e) => setNewTpl({ ...newTpl, cta_text: e.target.value })} /></div>
                <Button onClick={createTemplate} disabled={!newTpl.name}>Créer le template</Button>
              </CardContent>
            </Card>
          )}

          {filtered.length === 0 ? (
            <Card><CardContent className="py-12 text-center"><Image className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" /><p className="text-muted-foreground">Aucun template. Créez-en un.</p></CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((t) => (
                <Card key={t.id} className="overflow-hidden">
                  {t.image_url ? (
                    <img src={t.image_url} alt={t.name} className="w-full aspect-[9/16] object-cover max-h-48" />
                  ) : (
                    <div className="w-full aspect-video bg-muted flex flex-col items-center justify-center p-4">
                      <Smartphone className="h-8 w-8 text-muted-foreground/30 mb-2" />
                      <p className="text-xs font-semibold text-center">{t.title_text || t.name}</p>
                      {t.subtitle_text && <p className="text-[10px] text-muted-foreground text-center mt-1">{t.subtitle_text}</p>}
                      {t.cta_text && <span className="mt-2 text-[10px] font-bold text-primary">{t.cta_text}</span>}
                    </div>
                  )}
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm truncate">{t.name}</p>
                      <Badge variant={t.is_active ? "default" : "secondary"} className="text-[10px]">{t.is_active ? "Actif" : "Inactif"}</Badge>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {t.service_slug && <Badge variant="outline" className="text-[10px]">{t.service_slug}</Badge>}
                      {t.city_slug && <Badge variant="outline" className="text-[10px]">{t.city_slug}</Badge>}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="flex-1" onClick={() => testMatch(t.service_slug ?? "", t.city_slug ?? "")}><Eye className="h-3 w-3 mr-1" /> Tester</Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteTemplate(t.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── Rules ─── */}
        <TabsContent value="rules" className="space-y-4 mt-4">
          {rules.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Aucune règle configurée. Le moteur utilise le matching automatique.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {rules.map((r) => (
                <Card key={r.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="text-[10px]">P{r.priority}</Badge>
                      {r.service_match && <Badge variant="outline" className="text-[10px]">{r.service_match}</Badge>}
                      {r.city_match && <Badge variant="outline" className="text-[10px]">{r.city_match}</Badge>}
                      {r.intent_match && <Badge variant="outline" className="text-[10px]">{r.intent_match}</Badge>}
                      <span className="text-xs text-muted-foreground">→ {r.template?.name ?? r.fallback_type}</span>
                    </div>
                    <Badge variant={r.is_active ? "default" : "secondary"} className="text-[10px]">{r.is_active ? "Actif" : "Off"}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── Logs ─── */}
        <TabsContent value="logs" className="space-y-4 mt-4">
          {logs.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Aucun log.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {logs.slice(0, 50).map((l) => (
                <Card key={l.id}>
                  <CardContent className="p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span>{new Date(l.created_at).toLocaleString("fr-CA", { dateStyle: "short", timeStyle: "short" })}</span>
                      <span className="font-medium">{l.template_name ?? "—"}</span>
                      {l.service_slug && <Badge variant="outline" className="text-[9px]">{l.service_slug}</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      {l.fallback_used && <Badge variant="secondary" className="text-[9px]">Fallback</Badge>}
                      {l.click ? (
                        <Badge className="bg-green-500/20 text-green-700 text-[9px]">Clic ✓</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] text-muted-foreground">—</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10"><Icon className="h-4 w-4 text-primary" /></div>
        <div>
          <p className="text-lg font-bold font-display">{value}</p>
          <p className="text-[11px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
