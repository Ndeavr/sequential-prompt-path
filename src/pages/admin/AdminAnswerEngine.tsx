import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus, Trash2, Save, Sparkles, BookOpen, Edit3, Eye,
  Clock, BarChart3, Loader2, AlertTriangle, MessageCircle
} from "lucide-react";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  useAnswerTemplates, useAnswerLogs, useSaveTemplate, useDeleteTemplate,
} from "@/hooks/useAnswerEngine";
import { toast } from "sonner";

const CATEGORIES = [
  "toiture", "fenêtres", "maçonnerie", "plomberie", "électricité",
  "isolation", "CVAC", "fondation", "stationnement", "copropriété",
  "fonds_prévoyance", "subventions", "énergie", "balcons", "général",
];

function TemplateEditor({ template, onSave, onCancel }: { template: any; onSave: (t: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    question_pattern: template?.question_pattern || "",
    category: template?.category || "général",
    short_answer: template?.short_answer || "",
    explanation: template?.explanation || "",
    causes: (template?.causes || []).join("\n"),
    solutions: (template?.solutions || []).join("\n"),
    cost_min: template?.cost_min || "",
    cost_max: template?.cost_max || "",
    recommended_professionals: (template?.recommended_professionals || []).join(", "),
    urgency: template?.urgency || "medium",
    preventive_advice: (template?.preventive_advice || []).join("\n"),
    follow_up_question: template?.follow_up_question || "",
    related_questions: (template?.related_questions || []).join("\n"),
    confidence_base: template?.confidence_base || 0.8,
    is_published: template?.is_published ?? true,
    seo_title: template?.seo_title || "",
    seo_description: template?.seo_description || "",
  });

  const handleSave = () => {
    onSave({
      ...(template?.id ? { id: template.id } : {}),
      question_pattern: form.question_pattern,
      category: form.category,
      short_answer: form.short_answer,
      explanation: form.explanation,
      causes: form.causes.split("\n").filter(Boolean),
      solutions: form.solutions.split("\n").filter(Boolean),
      cost_min: form.cost_min ? Number(form.cost_min) : null,
      cost_max: form.cost_max ? Number(form.cost_max) : null,
      recommended_professionals: form.recommended_professionals.split(",").map((s: string) => s.trim()).filter(Boolean),
      urgency: form.urgency,
      preventive_advice: form.preventive_advice.split("\n").filter(Boolean),
      follow_up_question: form.follow_up_question,
      related_questions: form.related_questions.split("\n").filter(Boolean),
      confidence_base: Number(form.confidence_base),
      is_published: form.is_published,
      seo_title: form.seo_title || null,
      seo_description: form.seo_description || null,
    });
  };

  const updateField = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="text-[10px] text-slate-500 uppercase mb-1 block">Pattern de question</label>
          <Input value={form.question_pattern} onChange={e => updateField("question_pattern", e.target.value)} className="bg-white/5 border-white/10 text-white" placeholder="condensation fenêtres" />
        </div>
        <div>
          <label className="text-[10px] text-slate-500 uppercase mb-1 block">Catégorie</label>
          <Select value={form.category} onValueChange={v => updateField("category", v)}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[10px] text-slate-500 uppercase mb-1 block">Urgence</label>
          <Select value={form.urgency} onValueChange={v => updateField("urgency", v)}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Faible</SelectItem>
              <SelectItem value="medium">Moyenne</SelectItem>
              <SelectItem value="high">Élevée</SelectItem>
              <SelectItem value="emergency">Urgence</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="text-[10px] text-slate-500 uppercase mb-1 block">Réponse courte</label>
        <Textarea value={form.short_answer} onChange={e => updateField("short_answer", e.target.value)} className="bg-white/5 border-white/10 text-white" rows={2} />
      </div>
      <div>
        <label className="text-[10px] text-slate-500 uppercase mb-1 block">Explication</label>
        <Textarea value={form.explanation} onChange={e => updateField("explanation", e.target.value)} className="bg-white/5 border-white/10 text-white" rows={3} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] text-slate-500 uppercase mb-1 block">Causes (une par ligne)</label>
          <Textarea value={form.causes} onChange={e => updateField("causes", e.target.value)} className="bg-white/5 border-white/10 text-white" rows={3} />
        </div>
        <div>
          <label className="text-[10px] text-slate-500 uppercase mb-1 block">Solutions (une par ligne)</label>
          <Textarea value={form.solutions} onChange={e => updateField("solutions", e.target.value)} className="bg-white/5 border-white/10 text-white" rows={3} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="text-[10px] text-slate-500 uppercase mb-1 block">Coût min ($)</label>
          <Input type="number" value={form.cost_min} onChange={e => updateField("cost_min", e.target.value)} className="bg-white/5 border-white/10 text-white" />
        </div>
        <div>
          <label className="text-[10px] text-slate-500 uppercase mb-1 block">Coût max ($)</label>
          <Input type="number" value={form.cost_max} onChange={e => updateField("cost_max", e.target.value)} className="bg-white/5 border-white/10 text-white" />
        </div>
        <div>
          <label className="text-[10px] text-slate-500 uppercase mb-1 block">Confiance (0-1)</label>
          <Input type="number" step="0.05" min="0" max="1" value={form.confidence_base} onChange={e => updateField("confidence_base", e.target.value)} className="bg-white/5 border-white/10 text-white" />
        </div>
        <div className="flex items-end gap-2">
          <label className="text-[10px] text-slate-500 uppercase mb-1 block">Publié</label>
          <Switch checked={form.is_published} onCheckedChange={v => updateField("is_published", v)} />
        </div>
      </div>

      <div>
        <label className="text-[10px] text-slate-500 uppercase mb-1 block">Professionnels recommandés (séparés par virgule)</label>
        <Input value={form.recommended_professionals} onChange={e => updateField("recommended_professionals", e.target.value)} className="bg-white/5 border-white/10 text-white" />
      </div>
      <div>
        <label className="text-[10px] text-slate-500 uppercase mb-1 block">Conseils préventifs (un par ligne)</label>
        <Textarea value={form.preventive_advice} onChange={e => updateField("preventive_advice", e.target.value)} className="bg-white/5 border-white/10 text-white" rows={2} />
      </div>
      <div>
        <label className="text-[10px] text-slate-500 uppercase mb-1 block">Question de suivi</label>
        <Input value={form.follow_up_question} onChange={e => updateField("follow_up_question", e.target.value)} className="bg-white/5 border-white/10 text-white" />
      </div>
      <div>
        <label className="text-[10px] text-slate-500 uppercase mb-1 block">Questions connexes (une par ligne)</label>
        <Textarea value={form.related_questions} onChange={e => updateField("related_questions", e.target.value)} className="bg-white/5 border-white/10 text-white" rows={3} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] text-slate-500 uppercase mb-1 block">Titre SEO</label>
          <Input value={form.seo_title} onChange={e => updateField("seo_title", e.target.value)} className="bg-white/5 border-white/10 text-white" />
        </div>
        <div>
          <label className="text-[10px] text-slate-500 uppercase mb-1 block">Description SEO</label>
          <Input value={form.seo_description} onChange={e => updateField("seo_description", e.target.value)} className="bg-white/5 border-white/10 text-white" />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} className="border-white/10 text-slate-300">Annuler</Button>
        <Button onClick={handleSave} className="bg-violet-600 hover:bg-violet-500 text-white border-0 gap-1.5">
          <Save className="w-4 h-4" /> Sauvegarder
        </Button>
      </div>
    </div>
  );
}

export default function AdminAnswerEngine() {
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [showEditor, setShowEditor] = useState(false);

  const { data: templates, isLoading: templatesLoading } = useAnswerTemplates();
  const { data: logs } = useAnswerLogs();
  const saveMutation = useSaveTemplate();
  const deleteMutation = useDeleteTemplate();

  const handleSave = async (t: any) => {
    try {
      await saveMutation.mutateAsync(t);
      toast.success("Template sauvegardé");
      setShowEditor(false);
      setEditingTemplate(null);
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Template supprimé");
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-4 md:p-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-3">
              <Sparkles className="w-7 h-7 text-violet-400" />
              Moteur de Réponses
            </h1>
            <p className="text-slate-400 text-sm mt-1">Templates, logs, et gestion du graphe de connaissances</p>
          </div>
          <Button
            onClick={() => { setEditingTemplate(null); setShowEditor(true); }}
            className="bg-violet-600 hover:bg-violet-500 text-white border-0 gap-2"
          >
            <Plus className="w-4 h-4" /> Nouveau template
          </Button>
        </motion.div>

        <Tabs defaultValue="templates" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="templates" className="gap-1.5"><BookOpen className="w-3.5 h-3.5" />Templates ({templates?.length || 0})</TabsTrigger>
            <TabsTrigger value="logs" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" />Logs ({logs?.length || 0})</TabsTrigger>
          </TabsList>

          {/* Templates */}
          <TabsContent value="templates">
            {showEditor && (
              <div className="mb-6">
                <TemplateEditor
                  template={editingTemplate}
                  onSave={handleSave}
                  onCancel={() => { setShowEditor(false); setEditingTemplate(null); }}
                />
              </div>
            )}

            <div className="space-y-2">
              {templates?.map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{t.question_pattern}</span>
                      <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                      <Badge variant="outline" className={`text-[10px] ${t.urgency === "high" || t.urgency === "emergency" ? "border-rose-500/30 text-rose-300" : t.urgency === "medium" ? "border-amber-500/30 text-amber-300" : "border-emerald-500/30 text-emerald-300"}`}>
                        {t.urgency}
                      </Badge>
                      {!t.is_published && <Badge variant="outline" className="text-[10px] border-slate-500/30 text-slate-400">Brouillon</Badge>}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-1">{t.short_answer}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white" onClick={() => { setEditingTemplate(t); setShowEditor(true); }}>
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-slate-400 hover:text-rose-400" onClick={() => handleDelete(t.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              {templatesLoading && <div className="text-center py-8"><Loader2 className="w-6 h-6 text-violet-400 animate-spin mx-auto" /></div>}
              {templates?.length === 0 && !templatesLoading && (
                <div className="text-center py-12 text-slate-500 text-sm">Aucun template. Créez-en un pour alimenter le moteur.</div>
              )}
            </div>
          </TabsContent>

          {/* Logs */}
          <TabsContent value="logs">
            <div className="space-y-2">
              {logs?.map((l) => {
                const answer = l.structured_answer as any;
                return (
                  <div key={l.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <MessageCircle className="w-3.5 h-3.5 text-violet-400" />
                          <span className="font-medium text-sm">{l.question}</span>
                          <Badge variant="outline" className="text-[10px]">{l.answer_mode}</Badge>
                          {l.confidence_score != null && (
                            <Badge variant="outline" className={`text-[10px] ${Number(l.confidence_score) >= 0.8 ? "border-emerald-500/30 text-emerald-300" : "border-amber-500/30 text-amber-300"}`}>
                              {Math.round(Number(l.confidence_score) * 100)}%
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{answer?.short_answer}</p>
                      </div>
                      <div className="text-[10px] text-slate-500 shrink-0">
                        {l.response_time_ms}ms<br />
                        {new Date(l.created_at).toLocaleString("fr-CA")}
                      </div>
                    </div>
                  </div>
                );
              })}
              {logs?.length === 0 && (
                <div className="text-center py-12 text-slate-500 text-sm">Aucun log de réponse.</div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
