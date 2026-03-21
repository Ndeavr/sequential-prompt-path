/**
 * Setup Step 4: Upload documents (RBQ, insurance, certifications)
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, FileText, Upload, CheckCircle2, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const DOC_TYPES = [
  { value: "rbq_license", label: "Licence RBQ" },
  { value: "insurance", label: "Certificat d'assurance" },
  { value: "certification", label: "Certification professionnelle" },
  { value: "asp_card", label: "Carte ASP Construction" },
  { value: "business_registration", label: "Enregistrement d'entreprise (NEQ)" },
  { value: "other", label: "Autre document" },
];

interface Props {
  userId?: string;
  onNext: () => void;
  onBack: () => void;
}

export default function SetupStepDocuments({ userId, onNext, onBack }: Props) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState("rbq_license");

  useEffect(() => {
    if (!userId) return;
    loadDocs();
  }, [userId]);

  const loadDocs = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("storage_documents")
      .select("*")
      .eq("user_id", userId)
      .eq("bucket", "contractor-documents")
      .order("created_at", { ascending: false });
    setDocuments(data ?? []);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setUploading(true);
    const path = `${userId}/${Date.now()}-${file.name}`;

    const { error: storageErr } = await supabase.storage
      .from("contractor-documents")
      .upload(path, file);

    if (storageErr) {
      toast.error("Erreur d'upload: " + storageErr.message);
      setUploading(false);
      return;
    }

    const { error: dbErr } = await supabase.from("storage_documents").insert({
      user_id: userId,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      bucket: "contractor-documents",
      storage_path: path,
      entity_type: "contractor",
      document_category: selectedType,
    });

    if (dbErr) {
      toast.error("Erreur: " + dbErr.message);
    } else {
      toast.success("Document téléversé !");
      await loadDocs();
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleDelete = async (doc: any) => {
    await supabase.storage.from("contractor-documents").remove([doc.storage_path]);
    await supabase.from("storage_documents").delete().eq("id", doc.id);
    toast.success("Document supprimé");
    await loadDocs();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-warning/10 flex items-center justify-center mx-auto">
          <FileText className="h-7 w-7 text-warning" />
        </div>
        <h1 className="text-2xl font-display font-bold text-foreground">Documents & certifications</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Téléversez vos documents pour augmenter votre score de confiance et accélérer la vérification.
        </p>
      </div>

      <div className="rounded-3xl border border-border/50 bg-card/60 backdrop-blur p-6 space-y-4">
        <div className="flex gap-3">
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="bg-background/50 flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOC_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <label className="cursor-pointer">
            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleUpload} disabled={uploading} />
            <Button asChild variant="outline" disabled={uploading} className="gap-2">
              <span>
                <Upload className="h-4 w-4" />
                {uploading ? "Upload…" : "Téléverser"}
              </span>
            </Button>
          </label>
        </div>

        {documents.length > 0 ? (
          <div className="space-y-2">
            {documents.map(doc => (
              <div key={doc.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/30 bg-background/30">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {DOC_TYPES.find(t => t.value === doc.document_category)?.label || doc.document_category || "Document"}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(doc)}>
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground/60 text-sm">
            Aucun document téléversé. Cette étape est optionnelle.
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2"><ArrowLeft className="h-4 w-4" /> Retour</Button>
        <Button onClick={onNext} className="rounded-2xl px-6 gap-2 shadow-[var(--shadow-glow)]">
          {documents.length > 0 ? "Continuer" : "Passer cette étape"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
