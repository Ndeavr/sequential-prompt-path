import { usePropertyDocuments } from "@/hooks/usePropertyPassport";
import PropertyDocumentUpload from "./PropertyDocumentUpload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function PropertyDocuments({ propertyId }: { propertyId: string }) {
  const { data: docs = [], isLoading } = usePropertyDocuments(propertyId);

  async function openDocument(storagePath: string | null, fileUrl: string | null) {
    if (fileUrl) {
      window.open(fileUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (!storagePath) return;
    const { data, error } = await supabase.storage
      .from("property-documents")
      .createSignedUrl(storagePath, 60);
    if (!error && data?.signedUrl) {
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-foreground">Documents</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Dossier documentaire privé</p>
        </div>
        <Badge variant="secondary" className="text-xs">{docs.length}</Badge>
      </div>

      <PropertyDocumentUpload propertyId={propertyId} />

      <div className="mt-4">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : docs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            Aucun document téléversé.
          </p>
        ) : (
          <div className="space-y-2">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/30 bg-background/50 p-3"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.document_type} · {new Date(doc.created_at).toLocaleDateString("fr-CA")}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openDocument(doc.storage_path, doc.file_url)}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
