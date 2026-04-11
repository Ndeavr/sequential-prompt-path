import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Mail, MessageSquare, Save, Eye, Zap,
  Clock, StopCircle, FlaskConical, GitBranch, Flame, Target
} from "lucide-react";

const VARIABLE_REGEX = /\[([A-Za-z]+)\]/g;

const MOCK_DATA: Record<string, string> = {
  FirstName: "Martin",
  BusinessName: "Toitures ABC",
  City: "Laval",
  Category: "Toiture",
  AippPreScore: "62/100",
  MissedRevenue: "3 200$ – 8 500$",
  ProfileLink: "https://unpro.ca/pro/toitures-abc",
  AlexLink: "https://unpro.ca/alex/toitures-abc",
  PromoCode: "UNPRO-VIP",
  Phone: "450-555-1234",
  Website: "toituresabc.ca",
  ObservedGap: "Aucun avis Google récent",
};

const TYPE_LABELS: Record<string, { label: string; color: string; icon: typeof Mail }> = {
  cold_intro: { label: "Cold Intro", color: "text-blue-500", icon: Zap },
  demo_profile: { label: "Demo Profil", color: "text-purple-500", icon: Eye },
  followup_value: { label: "Follow-Up", color: "text-amber-500", icon: Target },
  last_call: { label: "Last Call", color: "text-red-500", icon: Flame },
  discovery: { label: "Découverte", color: "text-sky-500", icon: Mail },
  reminder: { label: "Rappel", color: "text-orange-500", icon: Clock },
  urgency: { label: "Urgence", color: "text-rose-500", icon: StopCircle },
  custom: { label: "Custom", color: "text-muted-foreground", icon: Mail },
};

function highlightVariables(text: string) {
  const parts = text.split(VARIABLE_REGEX);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="inline-block bg-primary/15 text-primary font-mono text-xs px-1 rounded mx-0.5">
        {"{{" + part + "}}"}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function renderPreview(text: string) {
  let result = text;
  for (const [key, value] of Object.entries(MOCK_DATA)) {
    result = result.replace(new RegExp(`\\[${key}\\]`, "g"), value);
  }
  return result;
}

export default function AdminOutreachTemplates() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [sequences, setSequences] = useState<any[]>([]);
  const [steps, setSteps] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);
  const [activeTab, setActiveTab] = useState("templates");

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [tRes, sRes, stRes] = await Promise.all([
      supabase.from("outreach_templates").select("*").order("template_type").order("template_name"),
      supabase.from("outreach_sequences").select("*").order("created_at"),
      supabase.from("outreach_sequence_steps").select("*").order("sequence_id").order("step_order"),
    ]);
    setTemplates(tRes.data || []);
    setSequences(sRes.data || []);
    setSteps(stRes.data || []);
    setLoading(false);
  }

  async function saveTemplate() {
    if (!editing) return;
    if (editing.id) {
      await supabase.from("outreach_templates").update({
        template_name: editing.template_name,
        subject_template: editing.subject_template,
        body_template: editing.body_template,
        template_type: editing.template_type,
      }).eq("id", editing.id);
    } else {
      await supabase.from("outreach_templates").insert({ ...editing, created_by: user?.id });
    }
    toast.success("Template sauvegardé");
    setEditing(null);
    loadAll();
  }

  // Group templates by type for A/B view
  const groupedByType = useMemo(() => {
    const groups: Record<string, any[]> = {};
    templates.forEach(t => {
      const type = t.template_type || "custom";
      if (!groups[type]) groups[type] = [];
      groups[type].push(t);
    });
    return groups;
  }, [templates]);

  const typeKeys = Object.keys(groupedByType);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/admin/outreach")}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Retour
      </Button>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-display text-2xl font-bold">Templates & Séquences</h1>
        <Button size="sm" onClick={() => setEditing({
          template_name: "", channel_type: "email", language: "fr",
          template_type: "custom", subject_template: "", body_template: ""
        })}>
          <Plus className="h-4 w-4 mr-1" /> Nouveau template
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="templates"><Mail className="h-3.5 w-3.5 mr-1" /> Templates</TabsTrigger>
          <TabsTrigger value="ab"><FlaskConical className="h-3.5 w-3.5 mr-1" /> A/B Testing</TabsTrigger>
          <TabsTrigger value="sequences"><GitBranch className="h-3.5 w-3.5 mr-1" /> Séquences</TabsTrigger>
        </TabsList>

        {/* ===== TEMPLATES TAB ===== */}
        <TabsContent value="templates" className="space-y-4">
          {/* Editor */}
          {editing && (
            <Card className="border-primary/30">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">
                    {editing.id ? "Modifier template" : "Nouveau template"}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setPreviewMode(!previewMode)}>
                    <Eye className="h-3.5 w-3.5 mr-1" /> {previewMode ? "Édition" : "Aperçu"}
                  </Button>
                </div>

                {previewMode ? (
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3 border">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Aperçu avec données fictives</div>
                    {editing.subject_template && (
                      <div className="font-semibold text-sm">{renderPreview(editing.subject_template)}</div>
                    )}
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                      {renderPreview(editing.body_template)}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Nom</Label>
                        <Input value={editing.template_name} onChange={e => setEditing({ ...editing, template_name: e.target.value })} />
                      </div>
                      <div>
                        <Label className="text-xs">Type</Label>
                        <select
                          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                          value={editing.template_type}
                          onChange={e => setEditing({ ...editing, template_type: e.target.value })}
                        >
                          <option value="cold_intro">Cold Intro</option>
                          <option value="demo_profile">Demo Profil</option>
                          <option value="followup_value">Follow-Up Value</option>
                          <option value="last_call">Last Call</option>
                          <option value="discovery">Découverte</option>
                          <option value="reminder">Rappel</option>
                          <option value="urgency">Urgence</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>
                    </div>
                    {editing.channel_type === "email" && (
                      <div>
                        <Label className="text-xs">Sujet</Label>
                        <Input value={editing.subject_template} onChange={e => setEditing({ ...editing, subject_template: e.target.value })} />
                      </div>
                    )}
                    <div>
                      <Label className="text-xs">Corps</Label>
                      <Textarea className="min-h-[160px] font-mono text-xs" value={editing.body_template} onChange={e => setEditing({ ...editing, body_template: e.target.value })} />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.keys(MOCK_DATA).map(v => (
                        <Badge key={v} variant="outline" className="text-[10px] cursor-pointer hover:bg-primary/10"
                          onClick={() => setEditing({
                            ...editing,
                            body_template: editing.body_template + `[${v}]`
                          })}>
                          [{v}]
                        </Badge>
                      ))}
                    </div>
                  </>
                )}
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => { setEditing(null); setPreviewMode(false); }}>Annuler</Button>
                  <Button size="sm" onClick={saveTemplate}><Save className="h-4 w-4 mr-1" /> Sauvegarder</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Template List */}
          <div className="grid gap-3">
            {templates.map(t => {
              const meta = TYPE_LABELS[t.template_type] || TYPE_LABELS.custom;
              const Icon = meta.icon;
              return (
                <Card key={t.id} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => { setEditing(t); setPreviewMode(false); }}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={`h-4 w-4 shrink-0 ${meta.color}`} />
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{t.template_name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {highlightVariables(t.subject_template || t.body_template?.slice(0, 60) || "")}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0 ml-2">{meta.label}</Badge>
                  </CardContent>
                </Card>
              );
            })}
            {templates.length === 0 && !loading && (
              <div className="text-center py-12 text-muted-foreground">
                <Mail className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p>Aucun template créé.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ===== A/B TESTING TAB ===== */}
        <TabsContent value="ab" className="space-y-6">
          {typeKeys.filter(k => groupedByType[k].length >= 2).map(type => {
            const variants = groupedByType[type];
            const meta = TYPE_LABELS[type] || TYPE_LABELS.custom;
            return (
              <Card key={type}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 text-primary" />
                    {meta.label} — {variants.length} variants
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                  {variants.map((v: any, i: number) => (
                    <div key={v.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge className="text-[10px]">Variant {String.fromCharCode(65 + i)}</Badge>
                      </div>
                      <div className="font-medium text-xs">{v.subject_template}</div>
                      <div className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">
                        {renderPreview(v.body_template)}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
          {typeKeys.filter(k => groupedByType[k].length >= 2).length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FlaskConical className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>Créez au moins 2 variants du même type pour activer l'A/B testing.</p>
            </div>
          )}
        </TabsContent>

        {/* ===== SEQUENCES TAB ===== */}
        <TabsContent value="sequences" className="space-y-4">
          {sequences.map(seq => {
            const seqSteps = steps.filter(s => s.sequence_id === seq.id).sort((a: any, b: any) => a.step_order - b.step_order);
            return (
              <Card key={seq.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-primary" />
                    {seq.sequence_name}
                    <Badge variant={seq.status === "active" ? "default" : "secondary"} className="text-[10px] ml-auto">
                      {seq.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative pl-6 space-y-0">
                    {seqSteps.map((step: any, idx: number) => {
                      const isLast = idx === seqSteps.length - 1;
                      const hours = step.delay_hours || 0;
                      const delayLabel = hours === 0 ? "Immédiat" : hours < 24 ? `${hours}h` : `J+${Math.round(hours / 24)}`;
                      return (
                        <div key={step.id} className="relative pb-4">
                          {/* Timeline line */}
                          {!isLast && <div className="absolute left-[-16px] top-6 bottom-0 w-0.5 bg-border" />}
                          {/* Timeline dot */}
                          <div className={`absolute left-[-20px] top-1.5 w-2.5 h-2.5 rounded-full border-2 ${step.is_active ? 'bg-primary border-primary' : 'bg-muted border-muted-foreground/30'}`} />
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-medium text-xs">{step.step_name}</div>
                              <div className="text-[10px] text-muted-foreground">{step.subject_template}</div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Badge variant="outline" className="text-[10px]">
                                <Clock className="h-2.5 w-2.5 mr-0.5" /> {delayLabel}
                              </Badge>
                              {step.stop_if_json && (
                                <Badge variant="destructive" className="text-[10px]">
                                  <StopCircle className="h-2.5 w-2.5 mr-0.5" /> Auto-stop
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {sequences.length === 0 && !loading && (
            <div className="text-center py-12 text-muted-foreground">
              <GitBranch className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>Aucune séquence configurée.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
