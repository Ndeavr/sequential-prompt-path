import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useProperties } from "@/hooks/useProperties";
import { useCreateQuote, useUploadQuoteFile } from "@/hooks/useQuotes";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import PropertySelect from "@/components/shared/PropertySelect";

const QuoteUploadPage = () => {
  const navigate = useNavigate();
  const { data: properties } = useProperties();
  const createQuote = useCreateQuote();
  const uploadFile = useUploadQuoteFile();
  const [form, setForm] = useState({ title: "", description: "", amount: "", property_id: "" });
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.property_id) { toast.error("Sélectionnez une propriété."); return; }
    try {
      let storagePath: string | undefined;
      if (file) {
        // Upload returns storage path (bucket is private)
        storagePath = await uploadFile.mutateAsync(file);
      }
      await createQuote.mutateAsync({
        title: form.title,
        description: form.description || undefined,
        amount: form.amount ? parseFloat(form.amount) : undefined,
        property_id: form.property_id,
        file_url: storagePath,
      });
      toast.success("Soumission créée !");
      navigate("/dashboard/quotes");
    } catch {
      toast.error("Erreur lors de la création.");
    }
  };

  const isPending = createQuote.isPending || uploadFile.isPending;

  return (
    <DashboardLayout>
      <PageHeader title="Téléverser une soumission" description="Ajoutez une soumission d'entrepreneur" />
      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Propriété *</Label>
              <PropertySelect
                value={form.property_id}
                onChange={(v) => setForm((f) => ({ ...f, property_id: v }))}
                properties={properties}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Titre *</Label>
              <Input id="title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required placeholder="Ex: Rénovation cuisine" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Détails de la soumission…" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Montant ($)</Label>
              <Input id="amount" type="number" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="15000" />
            </div>
            <div className="space-y-2">
              <Label>Fichier (PDF, image)</Label>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("file-input")?.click()}>
                  <Upload className="h-4 w-4 mr-1" /> Choisir un fichier
                </Button>
                <span className="text-sm text-muted-foreground">{file?.name || "Aucun fichier"}</span>
              </div>
              <input id="file-input" type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isPending}>{isPending ? "Envoi…" : "Créer la soumission"}</Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>Annuler</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default QuoteUploadPage;
