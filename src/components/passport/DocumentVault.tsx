/**
 * UNPRO — Document Vault
 * Stores and displays property documents (quotes, invoices, warranties, manuals, insurance).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText, Upload, FolderOpen, Calendar, Download,
} from "lucide-react";
import { useState } from "react";
import AddDocumentDialog from "./AddDocumentDialog";

const DOC_TYPE_LABELS: Record<string, string> = {
  quote: "Soumission",
  invoice: "Facture",
  warranty: "Garantie",
  manual: "Manuel",
  insurance: "Assurance",
  tax_bill: "Compte de taxes",
  inspection: "Rapport d'inspection",
  permit: "Permis",
  other: "Autre",
};

interface Props {
  propertyId: string;
}

export default function DocumentVault({ propertyId }: Props) {
  const [showAdd, setShowAdd] = useState(false);

  const { data: docs, isLoading } = useQuery({
    queryKey: ["property-documents", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_documents")
        .select("*")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!propertyId,
  });

  const docsByType = (docs || []).reduce<Record<string, typeof docs>>((acc, doc) => {
    const type = doc.document_type || "other";
    if (!acc[type]) acc[type] = [];
    acc[type]!.push(doc);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-foreground">
          Coffre-fort de documents
        </h3>
        <Button size="sm" variant="outline" onClick={() => setShowAdd(true)} className="gap-1 text-xs">
          <Upload className="w-3 h-3" /> Ajouter
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-14 bg-muted/30 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && (!docs || docs.length === 0) && (
        <Card className="border-border/30">
          <CardContent className="p-6 text-center">
            <FolderOpen className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Aucun document. Téléversez vos soumissions, factures, garanties et autres documents importants.
            </p>
          </CardContent>
        </Card>
      )}

      {Object.entries(docsByType).map(([type, typeDocs]) => (
        <div key={type} className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
            {DOC_TYPE_LABELS[type] || type} ({typeDocs!.length})
          </p>
          {typeDocs!.map((doc) => (
            <Card key={doc.id} className="border-border/30">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {new Date(doc.created_at).toLocaleDateString("fr-CA")}
                    {doc.file_size && (
                      <span>· {(doc.file_size / 1024).toFixed(0)} KB</span>
                    )}
                  </div>
                </div>
                {doc.notes && (
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {doc.notes.slice(0, 20)}
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ))}

      <AddDocumentDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        propertyId={propertyId}
      />
    </div>
  );
}
