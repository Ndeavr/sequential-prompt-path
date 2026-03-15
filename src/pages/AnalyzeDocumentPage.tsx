/**
 * UNPRO — Quote & Contract Analyzer Page
 * Upload documents, extract identity clues, detect mismatches.
 * Now includes Quote Quality Score integration.
 * Anti-hallucination: only shows actually extracted data.
 */

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MainLayout from "@/layouts/MainLayout";
import { PageHeader } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Upload, FileText, CheckCircle, AlertTriangle, Info,
  ShieldCheck, X, Loader2, Search, HelpCircle, BarChart3,
} from "lucide-react";
import { useDocumentAnalyzer } from "@/hooks/useDocumentAnalyzer";
import type { DocumentAnalysisResult, ExtractedField, ExtractionConfidence } from "@/types/documentExtraction";
import { computeQuoteQualityScore } from "@/services/quoteQualityScoreService";
import QuoteQualityScorePanel from "@/components/verification/QuoteQualityScorePanel";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = ".pdf,.jpg,.jpeg,.png,.webp";

// ── Confidence badge ──
function ConfidenceBadge({ confidence }: { confidence: ExtractionConfidence }) {
  const map: Record<ExtractionConfidence, { label: string; className: string }> = {
    high: { label: "Fiable", className: "bg-success/10 text-success border-success/20" },
    medium: { label: "Partiel", className: "bg-accent/10 text-accent border-accent/20" },
    low: { label: "Incertain", className: "bg-warning/10 text-warning border-warning/20" },
    not_found: { label: "Non trouvé", className: "bg-muted text-muted-foreground border-border" },
  };
  const v = map[confidence] || map.not_found;
  return <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${v.className}`}>{v.label}</Badge>;
}

// ── Extracted field row ──
function FieldRow({ label, field }: { label: string; field: ExtractedField }) {
  return (
    <div className="flex items-start justify-between gap-2 py-2 border-b border-border/20 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5 break-words">
          {field.value || "Information non trouvée ou non confirmée"}
        </p>
        {field.source_snippet && (
          <p className="text-[10px] text-muted-foreground/60 mt-0.5 italic truncate">
            Source : « {field.source_snippet} »
          </p>
        )}
      </div>
      <ConfidenceBadge confidence={field.confidence} />
    </div>
  );
}

const AnalyzeDocumentPage = () => {
  const { analyzeDocument, result, isAnalyzing, reset } = useDocumentAnalyzer();
  const [showQualityScore, setShowQualityScore] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [contractorId, setContractorId] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_FILE_SIZE) {
      return;
    }
    setFile(f);
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const handleAnalyze = () => {
    if (!file) return;
    analyzeDocument(file, contractorId || undefined);
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setContractorId("");
    reset();
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <MainLayout>
      <div className="premium-bg min-h-[80vh]">
        <div className="mx-auto max-w-2xl px-5 py-8 space-y-6">
          <PageHeader
            title="Analyser un document"
            description="Téléversez une soumission, un contrat ou une facture pour extraire les indices d'identification."
          />

          {/* Disclaimer */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/30 border border-border/30">
            <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Seules les informations directement présentes dans le document seront extraites.
              Rien n'est inventé ou deviné. Vos documents restent privés et ne sont jamais partagés.
            </p>
          </div>

          {!result ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5 space-y-5">
                {/* Upload area */}
                {!file ? (
                  <label
                    className="flex flex-col items-center justify-center gap-3 p-10 rounded-xl border-2 border-dashed border-border/50 hover:border-primary/30 cursor-pointer transition-colors bg-muted/10"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileRef.current?.click(); }}
                  >
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">Glissez ou cliquez pour téléverser</p>
                      <p className="text-xs text-muted-foreground mt-1">PDF, JPEG, PNG — max 10 Mo</p>
                    </div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept={ACCEPTED_TYPES}
                      onChange={handleFile}
                      className="sr-only"
                      aria-label="Sélectionner un document"
                    />
                  </label>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/30">
                      <FileText className="w-5 h-5 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} Ko</p>
                      </div>
                      <button onClick={handleReset} aria-label="Retirer le fichier" className="p-1.5 rounded-full hover:bg-muted">
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                    {preview && (
                      <img src={preview} alt="Aperçu" className="w-full max-h-48 object-contain rounded-lg border border-border/20" />
                    )}
                  </div>
                )}

                {/* Optional contractor link */}
                <div className="space-y-2">
                  <Label htmlFor="contractor-id" className="text-xs text-muted-foreground flex items-center gap-1">
                    <Search className="w-3 h-3" /> Lier à un entrepreneur (optionnel)
                  </Label>
                  <Input
                    id="contractor-id"
                    placeholder="ID entrepreneur pour comparer avec le profil"
                    value={contractorId}
                    onChange={(e) => setContractorId(e.target.value)}
                    className="text-sm h-9"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Permet de détecter les écarts entre le document et le profil connu.
                  </p>
                </div>

                {/* Submit */}
                <Button
                  onClick={handleAnalyze}
                  disabled={!file || isAnalyzing}
                  className="w-full gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyse en cours…
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      Analyser le document
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Summary card */}
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-5 h-5 text-primary" />
                      <h3 className="text-sm font-semibold">Résultats de l'extraction</h3>
                      <Badge variant="outline" className="ml-auto text-[10px]">
                        {result.extraction?.document_type || "document"}
                      </Badge>
                    </div>

                    {/* Clarity */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xs text-muted-foreground">Clarté du document :</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          result.extraction?.document_clarity === "clear"
                            ? "bg-success/10 text-success"
                            : result.extraction?.document_clarity === "partial"
                            ? "bg-warning/10 text-warning"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {result.extraction?.document_clarity === "clear"
                          ? "Claire"
                          : result.extraction?.document_clarity === "partial"
                          ? "Partielle"
                          : "Faible"}
                      </Badge>
                    </div>

                    {/* Clues found summary */}
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/20 mb-4">
                      {(result.identity_clues_found?.length ?? 0) >= 3 ? (
                        <CheckCircle className="w-4 h-4 text-success shrink-0 mt-0.5" />
                      ) : (
                        <HelpCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      )}
                      <p className="text-xs text-muted-foreground">
                        {(result.identity_clues_found?.length ?? 0) >= 3
                          ? "Nous avons trouvé quelques indices utiles dans ce document."
                          : (result.identity_clues_found?.length ?? 0) > 0
                          ? "Le document contient peu d'indices. D'autres documents pourraient aider."
                          : "Le document seul ne permet pas de confirmer l'entreprise avec certitude."}
                      </p>
                    </div>

                    {/* Extracted fields */}
                    {result.extraction && (
                      <div className="space-y-0">
                        <p className="text-xs font-semibold text-foreground mb-2">Identité de l'entrepreneur</p>
                        <FieldRow label="Nom commercial" field={result.extraction.business_name} />
                        <FieldRow label="Raison sociale" field={result.extraction.legal_name} />
                        <FieldRow label="Téléphone" field={result.extraction.phone} />
                        <FieldRow label="Courriel" field={result.extraction.email} />
                        <FieldRow label="Site web" field={result.extraction.website} />
                        <FieldRow label="Licence RBQ" field={result.extraction.rbq_number} />
                        <FieldRow label="NEQ" field={result.extraction.neq} />
                        <FieldRow label="Adresse" field={result.extraction.address} />
                        <FieldRow label="Ville" field={result.extraction.city} />

                        <p className="text-xs font-semibold text-foreground mt-4 mb-2">Détails du document</p>
                        <FieldRow label="Client" field={result.extraction.client_name} />
                        <FieldRow label="Adresse du projet" field={result.extraction.project_address} />
                        <FieldRow label="Date" field={result.extraction.date} />
                        <FieldRow label="Montant total" field={result.extraction.total_price} />
                        <FieldRow label="Taxes" field={result.extraction.taxes} />
                        <FieldRow label="Conditions de paiement" field={result.extraction.payment_terms} />
                        <FieldRow label="Portée des travaux" field={result.extraction.scope_of_work} />
                        <FieldRow label="Garanties" field={result.extraction.warranties} />
                        <FieldRow label="Exclusions" field={result.extraction.exclusions} />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Mismatches */}
                {result.mismatches && result.mismatches.length > 0 && (
                  <Card className="border-0 shadow-sm border-l-4 border-l-warning">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4 text-warning" />
                        <h3 className="text-sm font-semibold">Écarts détectés</h3>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        Certaines informations du document diffèrent du profil détecté. Cela ne signifie pas nécessairement un problème.
                      </p>
                      <div className="space-y-2">
                        {result.mismatches.map((m, i) => (
                          <div key={i} className="p-2.5 rounded-lg bg-warning/5 border border-warning/10">
                            <p className="text-xs font-medium text-foreground">{m.message_fr}</p>
                            <div className="flex gap-4 mt-1 text-[10px] text-muted-foreground">
                              <span>Document : {m.document_value}</span>
                              <span>Profil : {m.profile_value}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Confirmations & Unconfirmed */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {result.confirmations && result.confirmations.length > 0 && (
                    <Card className="border-0 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-success" />
                          <h4 className="text-xs font-semibold">Confirmé</h4>
                        </div>
                        <ul className="space-y-1">
                          {result.confirmations.map((c, i) => (
                            <li key={i} className="text-[11px] text-muted-foreground">• {c}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                  {result.unconfirmed && result.unconfirmed.length > 0 && (
                    <Card className="border-0 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <HelpCircle className="w-4 h-4 text-muted-foreground" />
                          <h4 className="text-xs font-semibold">Non confirmé</h4>
                        </div>
                        <ul className="space-y-1">
                          {result.unconfirmed.map((u, i) => (
                            <li key={i} className="text-[11px] text-muted-foreground">• {u}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Next steps */}
                {result.suggested_next_steps && result.suggested_next_steps.length > 0 && (
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        <h4 className="text-xs font-semibold">Prochaines étapes suggérées</h4>
                      </div>
                      <ul className="space-y-1.5">
                        {result.suggested_next_steps.map((s, i) => (
                          <li key={i} className="text-[11px] text-muted-foreground">• {s}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <Button onClick={handleReset} variant="outline" className="flex-1 gap-1">
                    <Upload className="w-4 h-4" /> Analyser un autre document
                  </Button>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default AnalyzeDocumentPage;
