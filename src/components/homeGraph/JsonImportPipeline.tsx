import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Upload, FileJson, CheckCircle2, AlertTriangle, XCircle, Copy,
  Loader2, Download, Eye, Play,
} from "lucide-react";
import {
  validateImportPayload, executeImport, generateImportTemplate,
  type ImportValidation, type ImportResult, type UnproGraphPayload,
} from "@/services/blueprintGeneratorService";

export default function JsonImportPipeline() {
  const [jsonInput, setJsonInput] = useState("");
  const [validation, setValidation] = useState<ImportValidation | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [parsedPayload, setParsedPayload] = useState<UnproGraphPayload | null>(null);

  const validate = useMutation({
    mutationFn: async () => {
      let parsed: unknown;
      try { parsed = JSON.parse(jsonInput); } catch { throw new Error("JSON invalide"); }
      setParsedPayload(parsed as UnproGraphPayload);
      return validateImportPayload(parsed);
    },
    onSuccess: (data) => { setValidation(data); setImportResult(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const runImport = useMutation({
    mutationFn: async () => {
      if (!parsedPayload) throw new Error("Aucun payload validé");
      return executeImport(parsedPayload);
    },
    onSuccess: (data) => { setImportResult(data); toast.success("Import terminé"); },
    onError: () => toast.error("Erreur d'import"),
  });

  const copyTemplate = useCallback(() => {
    navigator.clipboard.writeText(generateImportTemplate());
    toast.success("Template JSON copié !");
  }, []);

  const downloadTemplate = useCallback(() => {
    const blob = new Blob([generateImportTemplate()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "unpro-graph-template.json"; a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setJsonInput(ev.target?.result as string); setValidation(null); setImportResult(null); };
    reader.readAsText(file);
  }, []);

  return (
    <div className="space-y-4">
      {/* Template Actions */}
      <Card className="border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileJson className="h-4 w-4 text-primary" />
            Format JSON standard UNPRO
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="text-xs" onClick={copyTemplate}>
            <Copy className="h-3 w-3 mr-1" /> Copier template
          </Button>
          <Button size="sm" variant="outline" className="text-xs" onClick={downloadTemplate}>
            <Download className="h-3 w-3 mr-1" /> Télécharger template
          </Button>
          <label className="cursor-pointer">
            <Button size="sm" variant="outline" className="text-xs pointer-events-none">
              <Upload className="h-3 w-3 mr-1" /> Importer fichier
            </Button>
            <input type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
          </label>
        </CardContent>
      </Card>

      {/* JSON Input */}
      <Card className="border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Coller le JSON</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder='{"problems": [...], "symptoms": [...], ...}'
            value={jsonInput}
            onChange={e => { setJsonInput(e.target.value); setValidation(null); setImportResult(null); }}
            className="min-h-[160px] font-mono text-xs"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => validate.mutate()} disabled={!jsonInput.trim() || validate.isPending}>
              {validate.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              Valider & Prévisualiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Validation Results */}
      {validation && (
        <Card className={`border-${validation.valid ? "emerald-500/30" : "destructive/30"}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {validation.valid
                ? <><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Validation réussie</>
                : <><XCircle className="h-4 w-4 text-destructive" /> Erreurs de validation</>
              }
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Preview Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {[
                { label: "Problèmes", value: validation.preview.problems },
                { label: "Symptômes", value: validation.preview.symptoms },
                { label: "Causes", value: validation.preview.causes },
                { label: "Solutions", value: validation.preview.solutions },
                { label: "Professions", value: validation.preview.professions },
                { label: "Tags", value: validation.preview.tags },
                { label: "Questions", value: validation.preview.questions },
                { label: "Relations", value: validation.preview.relations },
                { label: "Doublons", value: validation.preview.duplicates },
              ].map(item => (
                <div key={item.label} className="text-center p-2 rounded-lg bg-muted/30">
                  <p className="text-lg font-bold">{item.value}</p>
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>

            {/* Errors */}
            {validation.errors.length > 0 && (
              <div className="space-y-1">
                {validation.errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-destructive">
                    <XCircle className="h-3 w-3 shrink-0 mt-0.5" />
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Warnings */}
            {validation.warnings.length > 0 && (
              <div className="space-y-1">
                {validation.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-amber-500">
                    <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Import Button */}
            {validation.valid && (
              <Button onClick={() => runImport.mutate()} disabled={runImport.isPending} className="w-full sm:w-auto">
                {runImport.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                Lancer l'import (safe mode)
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Import Results */}
      {importResult && (
        <Card className={`border-${importResult.success ? "emerald-500/30" : "destructive/30"}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {importResult.success
                ? <><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Import réussi</>
                : <><AlertTriangle className="h-4 w-4 text-amber-500" /> Import partiel</>
              }
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {[
                { label: "Problèmes", value: importResult.inserted.problems },
                { label: "Symptômes", value: importResult.inserted.symptoms },
                { label: "Causes", value: importResult.inserted.causes },
                { label: "Solutions", value: importResult.inserted.solutions },
                { label: "Professions", value: importResult.inserted.professions },
                { label: "Tags", value: importResult.inserted.tags },
                { label: "Questions", value: importResult.inserted.questions },
                { label: "Relations", value: importResult.inserted.relations },
                { label: "Ignorés", value: importResult.skipped },
              ].map(item => (
                <div key={item.label} className="text-center p-2 rounded-lg bg-muted/30">
                  <p className="text-lg font-bold">{item.value}</p>
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
            {importResult.errors.length > 0 && (
              <div className="mt-3 space-y-1">
                {importResult.errors.map((e, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-destructive">
                    <XCircle className="h-3 w-3 shrink-0 mt-0.5" /><span>{e}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
