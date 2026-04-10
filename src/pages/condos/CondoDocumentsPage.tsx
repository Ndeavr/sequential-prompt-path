/**
 * UNPRO Condos — Documents Vault (wired to Supabase)
 */
import { useState } from "react";
import CondoLayout from "@/layouts/CondoLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Upload, Search, FileText, Download } from "lucide-react";
import { useSyndicates } from "@/hooks/useSyndicate";
import { useCondoDocuments } from "@/hooks/useCondoData";
import { EmptyState } from "@/components/shared";

const typeLabels: Record<string, string> = {
  reserve_fund_study: "Fonds de prévoyance",
  minutes: "Procès-verbal",
  insurance: "Assurance",
  inspection: "Inspection",
  legal: "Juridique",
  financial: "Financier",
  contract: "Contrat",
  maintenance: "Entretien",
  general: "Général",
};

function formatSize(bytes?: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(0) + " Ko";
  return (bytes / 1048576).toFixed(1) + " Mo";
}

const CondoDocumentsPage = () => {
  const { data: syndicates } = useSyndicates();
  const syndicateId = syndicates?.[0]?.id;
  const { data: documents, isLoading } = useCondoDocuments(syndicateId);
  const [search, setSearch] = useState("");

  const filtered = documents?.filter((d: any) =>
    (d.title || d.file_name || "").toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <CondoLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl font-bold">Documents</h1>
          <p className="text-sm text-muted-foreground">Coffre-fort numérique de votre syndicat</p>
        </div>
        <Button size="sm" className="rounded-xl">
          <Upload className="h-4 w-4 mr-1.5" /> Téléverser
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher un document..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 rounded-xl" />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : !filtered.length ? (
        <EmptyState
          icon={<FileText className="h-10 w-10 text-primary/40" />}
          message={search ? "Aucun document trouvé pour cette recherche." : "Aucun document. Téléversez vos premiers documents pour sécuriser votre dossier."}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((doc: any, i: number) => (
            <motion.div key={doc.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="border-border/40 bg-card/80 hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{doc.title || doc.file_name || "Document"}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      {doc.file_size && <span className="text-xs text-muted-foreground">{formatSize(doc.file_size)}</span>}
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{new Date(doc.created_at).toLocaleDateString("fr-CA")}</span>
                    </div>
                  </div>
                  {doc.document_type && (
                    <Badge variant="outline" className="text-[10px] hidden sm:inline-flex">
                      {typeLabels[doc.document_type] || doc.document_type}
                    </Badge>
                  )}
                  {doc.file_url && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" asChild>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </CondoLayout>
  );
};

export default CondoDocumentsPage;
