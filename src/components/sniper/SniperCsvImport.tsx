import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ParsedRow {
  businessName: string;
  city?: string;
  category?: string;
  websiteUrl?: string;
  phone?: string;
  email?: string;
  rbqNumber?: string;
}

export function SniperCsvImport({ onImported }: { onImported: () => void }) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped_duplicates: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  function parseCSV(text: string): ParsedRow[] {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[^a-z_]/g, ""));
    const colMap: Record<string, string> = {};
    headers.forEach((h, i) => {
      if (h.includes("nom") || h.includes("business") || h.includes("name") || h === "entreprise") colMap["businessName"] = String(i);
      if (h.includes("ville") || h.includes("city")) colMap["city"] = String(i);
      if (h.includes("categ") || h.includes("category") || h.includes("metier")) colMap["category"] = String(i);
      if (h.includes("site") || h.includes("web") || h.includes("url")) colMap["websiteUrl"] = String(i);
      if (h.includes("phone") || h.includes("tel")) colMap["phone"] = String(i);
      if (h.includes("email") || h.includes("courriel")) colMap["email"] = String(i);
      if (h.includes("rbq")) colMap["rbqNumber"] = String(i);
    });

    return lines.slice(1).map(line => {
      const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
      return {
        businessName: cols[Number(colMap["businessName"])] || "",
        city: cols[Number(colMap["city"])] || undefined,
        category: cols[Number(colMap["category"])] || undefined,
        websiteUrl: cols[Number(colMap["websiteUrl"])] || undefined,
        phone: cols[Number(colMap["phone"])] || undefined,
        email: cols[Number(colMap["email"])] || undefined,
        rbqNumber: cols[Number(colMap["rbqNumber"])] || undefined,
      };
    }).filter(r => r.businessName);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRows(parseCSV(text));
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("sniper-import-targets", {
        body: { targets: rows },
      });
      if (error) throw error;
      setResult(data);
      toast({ title: "Import terminé", description: `${data.imported} importés, ${data.skipped_duplicates} doublons ignorés` });
      onImported();
    } catch (err: any) {
      toast({ title: "Erreur d'import", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4" /> Importer des cibles CSV
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" /> Choisir un fichier
          </Button>
          {rows.length > 0 && <span className="text-sm text-muted-foreground">{rows.length} lignes détectées</span>}
        </div>

        {rows.length > 0 && (
          <>
            <div className="max-h-60 overflow-auto rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entreprise</TableHead>
                    <TableHead>Ville</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 20).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.businessName}</TableCell>
                      <TableCell>{r.city || "—"}</TableCell>
                      <TableCell>{r.category || "—"}</TableCell>
                      <TableCell className="text-xs truncate max-w-32">{r.websiteUrl || "—"}</TableCell>
                      <TableCell>{r.phone || "—"}</TableCell>
                      <TableCell className="text-xs">{r.email || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {rows.length > 20 && <p className="text-xs text-muted-foreground">…et {rows.length - 20} de plus</p>}
            <Button onClick={handleImport} disabled={importing} className="w-full">
              {importing ? "Import en cours…" : `Importer ${rows.length} cibles`}
            </Button>
          </>
        )}

        {result && (
          <div className="flex items-center gap-2 text-sm p-3 rounded-lg bg-primary/5 border border-primary/20">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span>{result.imported} importés, {result.skipped_duplicates} doublons ignorés</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
