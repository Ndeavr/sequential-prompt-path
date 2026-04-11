import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Layout, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { INTENTS, LAYOUTS, createTemplate, deleteTemplate } from "@/services/shareImageService";
import { toast } from "sonner";

export default function PageShareImageTemplates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIntent, setNewIntent] = useState("homeowner_problem");
  const [newLayout, setNewLayout] = useState("overlay");

  useEffect(() => { loadTemplates(); }, []);

  async function loadTemplates() {
    const { data } = await supabase
      .from("share_image_templates")
      .select("*")
      .order("created_at", { ascending: false });
    setTemplates(data || []);
    setLoading(false);
  }

  async function handleCreate() {
    try {
      await createTemplate({ name: newName, intent: newIntent, layout_type: newLayout });
      toast.success("Template créé");
      setDialogOpen(false);
      setNewName("");
      loadTemplates();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTemplate(id);
      toast.success("Template supprimé");
      loadTemplates();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const intentLabel = (v: string) => INTENTS.find((i) => i.value === v);
  const layoutLabel = (v: string) => LAYOUTS.find((l) => l.value === v);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/share-images")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold font-display">Templates d'images</h1>
            <p className="text-sm text-muted-foreground">{templates.length} template(s)</p>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Nouveau</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouveau template</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Card Toiture Laval" />
              </div>
              <div className="space-y-2">
                <Label>Intention</Label>
                <Select value={newIntent} onValueChange={setNewIntent}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INTENTS.map((i) => (
                      <SelectItem key={i.value} value={i.value}>{i.icon} {i.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Layout</Label>
                <Select value={newLayout} onValueChange={setNewLayout}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LAYOUTS.map((l) => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} disabled={!newName} className="w-full">Créer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-12">Chargement…</div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Layout className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Aucun template. Créez-en un pour commencer.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((t) => {
            const iCfg = intentLabel(t.intent);
            const lCfg = layoutLabel(t.layout_type);
            return (
              <Card key={t.id} className="hover:border-primary/20 transition-all">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{t.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[10px]">{iCfg?.icon} {iCfg?.label}</Badge>
                        <Badge variant="outline" className="text-[10px]">{lCfg?.label}</Badge>
                      </div>
                    </div>
                    <Badge variant={t.is_active ? "default" : "secondary"}>
                      {t.is_active ? "Actif" : "Inactif"}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/admin/share-images/generate?template=${t.id}`)}>
                      <Pencil className="h-3 w-3 mr-1" /> Utiliser
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)} className="text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
