import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUploadPropertyDocument } from "@/hooks/usePropertyPassport";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

const DOC_TYPES = [
  { value: "invoice", label: "Facture" },
  { value: "quote", label: "Soumission" },
  { value: "inspection", label: "Rapport d'inspection" },
  { value: "tax_bill", label: "Compte de taxes" },
  { value: "warranty", label: "Garantie" },
  { value: "insurance", label: "Assurance" },
  { value: "certificate", label: "Certificat" },
  { value: "other", label: "Autre" },
];

export default function PropertyDocumentUpload({ propertyId }: { propertyId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("invoice");
  const [title, setTitle] = useState("");
  const upload = useUploadPropertyDocument();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    try {
      await upload.mutateAsync({
        propertyId,
        file,
        documentType,
        title: title || file.name,
      });
      toast.success("Document téléversé");
      setFile(null);
      setTitle("");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du téléversement");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border/30 bg-background/50 p-4 space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Nouveau document
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Type</Label>
          <Select value={documentType} onValueChange={setDocumentType}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOC_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Titre</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Inspection 2024"
            className="h-9 text-sm"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Fichier</Label>
        <Input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="h-9 text-sm"
        />
      </div>

      <Button type="submit" size="sm" disabled={!file || upload.isPending} className="w-full sm:w-auto">
        {upload.isPending ? (
          <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Upload...</>
        ) : (
          <><Upload className="h-3.5 w-3.5 mr-1.5" /> Téléverser</>
        )}
      </Button>
    </form>
  );
}
