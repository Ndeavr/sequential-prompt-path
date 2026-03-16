import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProperties } from "@/hooks/useProperties";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, FileText, Check } from "lucide-react";
import PropertySelect from "@/components/shared/PropertySelect";
import { motion } from "framer-motion";

const DOCUMENT_TYPES = [
  { value: "inspection", label: "Rapport d'inspection" },
  { value: "insurance", label: "Assurance" },
  { value: "tax", label: "Évaluation municipale" },
  { value: "quote", label: "Soumission" },
  { value: "invoice", label: "Facture" },
  { value: "warranty", label: "Garantie" },
  { value: "permit", label: "Permis" },
  { value: "other", label: "Autre" },
];

const DocumentUploadPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: properties } = useProperties();
  const [form, setForm] = useState({ title: "", property_id: "", document_type: "other", notes: "" });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.property_id) {
      toast.error("Sélectionnez une propriété.");
      return;
    }

    setUploading(true);
    try {
      let storagePath: string | undefined;
      let fileSize: number | undefined;

      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${form.property_id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("property-photos")
          .upload(path, file);
        if (uploadError) throw uploadError;
        storagePath = path;
        fileSize = file.size;
      }

      const { error } = await supabase.from("property_documents").insert({
        property_id: form.property_id,
        user_id: user.id,
        title: form.title,
        document_type: form.document_type,
        storage_path: storagePath,
        file_size: fileSize,
        notes: form.notes || null,
      });

      if (error) throw error;

      setUploaded(true);
      toast.success("Document téléversé avec succès !");
      setTimeout(() => navigate(`/dashboard/properties/${form.property_id}`), 1500);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du téléversement.");
    } finally {
      setUploading(false);
    }
  };

  if (uploaded) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center"
          >
            <Check className="h-8 w-8 text-primary" />
          </motion.div>
          <h2 className="text-lg font-semibold text-foreground">Document ajouté</h2>
          <p className="text-sm text-muted-foreground">Redirection en cours…</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Téléverser un document"
        description="Ajoutez un document à une propriété"
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" />
            Nouveau document
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="property">Propriété *</Label>
              <PropertySelect
                value={form.property_id}
                onChange={(v) => setForm((f) => ({ ...f, property_id: v }))}
                properties={properties}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Titre du document *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
                placeholder="Ex: Inspection pré-achat 2024"
              />
            </div>

            <div className="space-y-2">
              <Label>Type de document</Label>
              <Select value={form.document_type} onValueChange={(v) => setForm((f) => ({ ...f, document_type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((dt) => (
                    <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Fichier</Label>
              <div className="border border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 transition-colors">
                <input
                  id="file"
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <label htmlFor="file" className="cursor-pointer flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  {file ? (
                    <span className="text-sm font-medium text-foreground">{file.name}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Cliquez pour sélectionner un fichier (PDF, image, Word)
                    </span>
                  )}
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optionnel)</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Détails supplémentaires…"
                rows={3}
              />
            </div>

            <Button type="submit" disabled={uploading} className="w-full">
              {uploading ? "Téléversement…" : "Téléverser le document"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default DocumentUploadPage;
