/**
 * UNPRO Condos — Documents Vault
 */
import CondoLayout from "@/layouts/CondoLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { motion } from "framer-motion";
import { FolderOpen, Upload, Search, FileText, File, Image, Download } from "lucide-react";

const mockDocs = [
  { id: "1", title: "Étude fonds de prévoyance 2024", type: "reserve_fund_study", file_name: "etude-fonds-2024.pdf", file_size: 2400000, created_at: "2024-06-15" },
  { id: "2", title: "Procès-verbal AG 2025", type: "minutes", file_name: "pv-ag-2025.pdf", file_size: 450000, created_at: "2025-03-20" },
  { id: "3", title: "Police d'assurance", type: "insurance", file_name: "police-2025.pdf", file_size: 1200000, created_at: "2025-01-10" },
  { id: "4", title: "Rapport inspection toiture", type: "inspection", file_name: "inspection-toiture.pdf", file_size: 3100000, created_at: "2024-09-05" },
  { id: "5", title: "Déclaration de copropriété", type: "legal", file_name: "declaration-copro.pdf", file_size: 5400000, created_at: "2015-05-01" },
  { id: "6", title: "Budget 2025-2026", type: "financial", file_name: "budget-2025-2026.xlsx", file_size: 180000, created_at: "2025-02-15" },
];

const typeLabels: Record<string, string> = {
  reserve_fund_study: "Fonds de prévoyance",
  minutes: "Procès-verbal",
  insurance: "Assurance",
  inspection: "Inspection",
  legal: "Juridique",
  financial: "Financier",
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(0) + " Ko";
  return (bytes / 1048576).toFixed(1) + " Mo";
}

const CondoDocumentsPage = () => {
  const [search, setSearch] = useState("");
  const filtered = mockDocs.filter(d => d.title.toLowerCase().includes(search.toLowerCase()));

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

      <div className="space-y-2">
        {filtered.map((doc, i) => (
          <motion.div key={doc.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Card className="border-border/40 bg-card/80 hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{doc.title}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{formatSize(doc.file_size)}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{new Date(doc.created_at).toLocaleDateString("fr-CA")}</span>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] hidden sm:inline-flex">{typeLabels[doc.type] || doc.type}</Badge>
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                  <Download className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </CondoLayout>
  );
};

export default CondoDocumentsPage;
