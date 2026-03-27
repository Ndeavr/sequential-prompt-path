import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Plus, Mail, MessageSquare, Save, Copy } from "lucide-react";

const SEED_TEMPLATES = [
  {
    template_name: "Découverte — Email 1",
    channel_type: "email",
    template_type: "discovery",
    subject_template: "[BusinessName] — aperçu de votre visibilité dans [City]",
    body_template: `Bonjour,

Nous avons analysé la présence actuelle de [BusinessName] dans [City].

Nous avons déjà préparé une partie de votre fiche professionnelle et identifié plusieurs opportunités d'amélioration.

Alex peut vous montrer cela et compléter votre profil avec vous ici :

[AlexLink]

Code promo : [PromoCode]

— L'équipe UNPRO`,
  },
  {
    template_name: "Rappel — Email 2",
    channel_type: "email",
    template_type: "reminder",
    subject_template: "Votre fiche est déjà partiellement prête",
    body_template: `Bonjour,

Nous avons déjà préparé une partie de votre fiche UNPRO pour [BusinessName].

Alex peut finaliser le tout avec vous en quelques minutes :

[AlexLink]

— L'équipe UNPRO`,
  },
  {
    template_name: "Urgence douce — Email 3",
    channel_type: "email",
    template_type: "urgency",
    subject_template: "[BusinessName] — votre lien personnalisé est prêt",
    body_template: `Bonjour,

Votre lien personnalisé est encore actif.

Alex peut vous montrer votre présence actuelle, vos points forts et ce qu'il manque pour compléter votre fiche :

[AlexLink]

— L'équipe UNPRO`,
  },
  {
    template_name: "SMS — Découverte",
    channel_type: "sms",
    template_type: "discovery",
    subject_template: "",
    body_template: `Bonjour [BusinessName], nous avons préparé un aperçu de votre présence actuelle dans [City]. Alex peut compléter votre fiche ici : [AlexLink]`,
  },
  {
    template_name: "SMS — Rappel",
    channel_type: "sms",
    template_type: "reminder",
    subject_template: "",
    body_template: `Rappel pour [BusinessName] : votre fiche est déjà partiellement prête. Alex peut la finaliser avec vous ici : [AlexLink]`,
  },
];

export default function AdminOutreachTemplates() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadTemplates(); }, []);

  async function loadTemplates() {
    setLoading(true);
    const { data } = await supabase.from("outreach_templates").select("*").order("created_at");
    setTemplates(data || []);
    setLoading(false);
  }

  async function seedTemplates() {
    const rows = SEED_TEMPLATES.map(t => ({ ...t, language: "fr", created_by: user?.id }));
    const { error } = await supabase.from("outreach_templates").insert(rows);
    if (error) return toast.error(error.message);
    toast.success("Templates par défaut créés");
    loadTemplates();
  }

  async function saveTemplate() {
    if (!editing) return;
    if (editing.id) {
      await supabase.from("outreach_templates").update({
        template_name: editing.template_name,
        subject_template: editing.subject_template,
        body_template: editing.body_template,
      }).eq("id", editing.id);
    } else {
      await supabase.from("outreach_templates").insert({ ...editing, created_by: user?.id });
    }
    toast.success("Template sauvegardé");
    setEditing(null);
    loadTemplates();
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/admin/outreach")}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Retour
      </Button>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Templates d'outreach</h1>
        <div className="flex gap-2">
          {templates.length === 0 && <Button variant="outline" size="sm" onClick={seedTemplates}>Charger templates par défaut</Button>}
          <Button size="sm" onClick={() => setEditing({ template_name: "", channel_type: "email", language: "fr", template_type: "custom", subject_template: "", body_template: "" })}>
            <Plus className="h-4 w-4 mr-1" /> Nouveau
          </Button>
        </div>
      </div>

      {/* Editor */}
      {editing && (
        <Card className="border-primary/30">
          <CardContent className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nom du template</Label>
                <Input value={editing.template_name} onChange={e => setEditing({ ...editing, template_name: e.target.value })} />
              </div>
              <div>
                <Label>Canal</Label>
                <div className="flex gap-2 mt-1">
                  <Button variant={editing.channel_type === "email" ? "default" : "outline"} size="sm" onClick={() => setEditing({ ...editing, channel_type: "email" })}><Mail className="h-3 w-3 mr-1" /> Email</Button>
                  <Button variant={editing.channel_type === "sms" ? "default" : "outline"} size="sm" onClick={() => setEditing({ ...editing, channel_type: "sms" })}><MessageSquare className="h-3 w-3 mr-1" /> SMS</Button>
                </div>
              </div>
            </div>
            {editing.channel_type === "email" && (
              <div>
                <Label>Sujet</Label>
                <Input value={editing.subject_template} onChange={e => setEditing({ ...editing, subject_template: e.target.value })} placeholder="[BusinessName] — aperçu de votre visibilité dans [City]" />
              </div>
            )}
            <div>
              <Label>Corps</Label>
              <Textarea className="min-h-[120px]" value={editing.body_template} onChange={e => setEditing({ ...editing, body_template: e.target.value })} />
            </div>
            <div className="text-xs text-muted-foreground">Variables: [BusinessName] [City] [Category] [AlexLink] [PromoCode] [AippPreScore] [Phone] [Website] [ObservedGap]</div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setEditing(null)}>Annuler</Button>
              <Button size="sm" onClick={saveTemplate}><Save className="h-4 w-4 mr-1" /> Sauvegarder</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List */}
      <div className="grid gap-3">
        {templates.map(t => (
          <Card key={t.id} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setEditing(t)}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {t.channel_type === "email" ? <Mail className="h-4 w-4 text-blue-500" /> : <MessageSquare className="h-4 w-4 text-green-500" />}
                <div>
                  <div className="font-medium text-sm">{t.template_name}</div>
                  {t.subject_template && <div className="text-xs text-muted-foreground">{t.subject_template}</div>}
                </div>
              </div>
              <Badge variant="outline" className="text-xs">{t.template_type || t.channel_type}</Badge>
            </CardContent>
          </Card>
        ))}
        {templates.length === 0 && !loading && (
          <div className="text-center py-12 text-muted-foreground">
            <Mail className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>Aucun template. Chargez les templates par défaut pour commencer.</p>
          </div>
        )}
      </div>
    </div>
  );
}
