import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, Search, Loader2, CheckCircle2, XCircle, AlertTriangle,
  ArrowRight, Building2, Phone, Mail, MapPin, Wrench, Camera,
  Shield, FileText, Clock, ChevronDown, ChevronUp, Eye, EyeOff, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import MainLayout from "@/layouts/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

type FieldStatus = "accepted" | "corrected" | "ignored" | "pending";

interface ExtractedField {
  field: string;
  value: string | string[] | number | boolean | null;
  confidence: number;
  source_url: string;
  status: FieldStatus;
  correctedValue?: string;
}

interface ImportSummary {
  pages_found: number;
  pages_crawled: number;
  fields_extracted: number;
  service_pages: number;
  city_pages: number;
}

type Phase = "input" | "crawling" | "results";

const FIELD_LABELS: Record<string, { label: string; labelFr: string; icon: any }> = {
  company_name: { label: "Company Name", labelFr: "Nom d'entreprise", icon: Building2 },
  legal_name: { label: "Legal Name", labelFr: "Nom légal", icon: Building2 },
  phones: { label: "Phone Numbers", labelFr: "Téléphones", icon: Phone },
  emails: { label: "Emails", labelFr: "Courriels", icon: Mail },
  address: { label: "Address", labelFr: "Adresse", icon: MapPin },
  city: { label: "City", labelFr: "Ville", icon: MapPin },
  province: { label: "Province", labelFr: "Province", icon: MapPin },
  postal_code: { label: "Postal Code", labelFr: "Code postal", icon: MapPin },
  service_categories: { label: "Categories", labelFr: "Catégories", icon: Wrench },
  primary_services: { label: "Primary Services", labelFr: "Services principaux", icon: Wrench },
  secondary_services: { label: "Secondary Services", labelFr: "Services secondaires", icon: Wrench },
  service_areas: { label: "Service Areas", labelFr: "Zones desservies", icon: MapPin },
  about_text: { label: "About", labelFr: "À propos", icon: FileText },
  cta_type: { label: "CTA Quality", labelFr: "Qualité CTA", icon: Eye },
  logo_url: { label: "Logo", labelFr: "Logo", icon: Camera },
  media_urls: { label: "Media", labelFr: "Médias", icon: Camera },
  proof_signals: { label: "Proof Signals", labelFr: "Signaux de confiance", icon: Shield },
  faq_content: { label: "FAQ", labelFr: "FAQ", icon: FileText },
  business_hours: { label: "Hours", labelFr: "Horaires", icon: Clock },
  languages: { label: "Languages", labelFr: "Langues", icon: Globe },
  years_in_business: { label: "Years", labelFr: "Années", icon: Clock },
  emergency_service: { label: "Emergency", labelFr: "Urgence", icon: AlertTriangle },
  warranty_info: { label: "Warranty", labelFr: "Garantie", icon: Shield },
  financing_available: { label: "Financing", labelFr: "Financement", icon: FileText },
};

const SENSITIVE_FIELDS = ["proof_signals", "license_number", "insurance_info", "certifications"];

export default function BusinessImportPage() {
  const [domain, setDomain] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [fields, setFields] = useState<ExtractedField[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const startImport = useCallback(async () => {
    if (!domain.trim()) return;
    setPhase("crawling");
    setProgress(0);
    setFields([]);
    setSummary(null);

    // Simulate progress steps
    const steps = [
      { p: 10, label: "Découverte des pages du site…" },
      { p: 25, label: "Analyse de la page principale…" },
      { p: 40, label: "Scan des pages services…" },
      { p: 55, label: "Scan des pages villes…" },
      { p: 70, label: "Extraction IA structurée…" },
      { p: 85, label: "Dédoublonnage et mapping…" },
      { p: 95, label: "Génération des suggestions…" },
    ];

    const interval = setInterval(() => {
      setProgress(prev => {
        const next = steps.find(s => s.p > prev);
        if (next) {
          setProgressLabel(next.label);
          return next.p;
        }
        return prev;
      });
    }, 2000);

    try {
      const { data, error } = await supabase.functions.invoke("import-business-website", {
        body: { website_url: domain.trim() },
      });

      clearInterval(interval);

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "Import failed");
      }

      const extractedFields: ExtractedField[] = (data.data.fields || []).map((f: any) => ({
        ...f,
        status: SENSITIVE_FIELDS.some(s => f.field.includes(s)) ? "pending" as const : "pending" as const,
      }));

      setFields(extractedFields);
      setSummary(data.summary);
      setProgress(100);
      setProgressLabel("Import terminé !");
      setTimeout(() => setPhase("results"), 600);
    } catch (err: any) {
      clearInterval(interval);
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
      setPhase("input");
    }
  }, [domain, toast]);

  const updateFieldStatus = (fieldName: string, status: FieldStatus) => {
    setFields(prev => prev.map(f => f.field === fieldName ? { ...f, status } : f));
  };

  const updateFieldValue = (fieldName: string, value: string) => {
    setFields(prev => prev.map(f => f.field === fieldName ? { ...f, correctedValue: value, status: "corrected" } : f));
  };

  const toggleExpand = (fieldName: string) => {
    setExpandedFields(prev => {
      const next = new Set(prev);
      next.has(fieldName) ? next.delete(fieldName) : next.add(fieldName);
      return next;
    });
  };

  const acceptedCount = fields.filter(f => f.status === "accepted" || f.status === "corrected").length;
  const ignoredCount = fields.filter(f => f.status === "ignored").length;
  const pendingCount = fields.filter(f => f.status === "pending").length;

  const confidenceColor = (c: number) =>
    c >= 0.8 ? "text-emerald-400" : c >= 0.5 ? "text-amber-400" : "text-red-400";

  const createProfile = useCallback(async () => {
    if (!user) {
      toast({ title: "Erreur", description: "Vous devez être connecté pour créer un profil.", variant: "destructive" });
      navigate("/login");
      return;
    }

    setIsCreating(true);
    try {
      const accepted = fields.filter(f => f.status === "accepted" || f.status === "corrected");
      const getVal = (fieldName: string): string | null => {
        const f = accepted.find(a => a.field === fieldName);
        if (!f) return null;
        const v = f.correctedValue ?? f.value;
        if (Array.isArray(v)) return v.join(", ");
        if (v === null || v === undefined) return null;
        return String(v);
      };
      const getArr = (fieldName: string): string[] | null => {
        const f = accepted.find(a => a.field === fieldName);
        if (!f) return null;
        const v = f.correctedValue ?? f.value;
        if (Array.isArray(v)) return v;
        if (typeof v === "string") return v.split(",").map(s => s.trim()).filter(Boolean);
        return null;
      };

      const businessName = getVal("company_name") || domain;
      const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

      // Create contractor
      const { data: contractor, error: cError } = await supabase
        .from("contractors")
        .insert({
          user_id: user.id,
          business_name: businessName,
          specialty: getVal("service_categories"),
          description: getVal("about_text"),
          city: getVal("city"),
          province: getVal("province"),
          postal_code: getVal("postal_code"),
          address: getVal("address"),
          phone: getArr("phones")?.[0] || null,
          email: getArr("emails")?.[0] || null,
          website: domain.startsWith("http") ? domain : `https://${domain}`,
          logo_url: getVal("logo_url"),
          portfolio_urls: getArr("media_urls"),
          slug,
          verification_status: "pending" as any,
        })
        .select("id")
        .single();

      if (cError) throw cError;
      const contractorId = contractor.id;

      // Insert services
      const primaryServices = getArr("primary_services") || [];
      const secondaryServices = getArr("secondary_services") || [];
      const serviceInserts = [
        ...primaryServices.map((s, i) => ({
          contractor_id: contractorId,
          service_name_fr: s,
          is_primary: true,
          is_active: true,
          display_order: i,
          data_source: "public_site_confirmed",
        })),
        ...secondaryServices.map((s, i) => ({
          contractor_id: contractorId,
          service_name_fr: s,
          is_primary: false,
          is_active: true,
          display_order: primaryServices.length + i,
          data_source: "public_site_confirmed",
        })),
      ];
      if (serviceInserts.length > 0) {
        await supabase.from("contractor_services").insert(serviceInserts);
      }

      // Insert service areas
      const areas = getArr("service_areas") || [];
      if (areas.length > 0) {
        await supabase.from("contractor_service_areas").insert(
          areas.map((a, i) => ({
            contractor_id: contractorId,
            city_name: a,
            is_primary: i === 0,
            data_source: "public_site_confirmed",
          }))
        );
      }

      // Insert media
      const mediaUrls = getArr("media_urls") || [];
      if (mediaUrls.length > 0) {
        await supabase.from("contractor_media").insert(
          mediaUrls.slice(0, 10).map((url, i) => ({
            contractor_id: contractorId,
            media_type: "photo",
            public_url: url,
            display_order: i,
            data_source: "public_site_confirmed",
            is_approved: false,
          }))
        );
      }

      // Create public page entry
      await supabase.from("contractor_public_pages").insert({
        contractor_id: contractorId,
        slug,
        is_published: false,
        seo_title: `${businessName} — UNPRO`,
      });

      toast({ title: "Profil créé !", description: `${businessName} a été importé avec ${accepted.length} champs.` });
      navigate(`/pro`);
    } catch (err: any) {
      console.error("Create profile error:", err);
      toast({ title: "Erreur", description: err.message || "Impossible de créer le profil.", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  }, [fields, domain, user, toast, navigate]);

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-foreground">
              Importer mon entreprise
            </h1>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Entrez votre domaine web. Nous analyserons vos pages publiques pour pré-remplir votre profil UNPRO.
            </p>
          </div>

          {/* Phase: Input */}
          <AnimatePresence mode="wait">
            {phase === "input" && (
              <motion.div
                key="input"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
                  <CardContent className="pt-6">
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          value={domain}
                          onChange={e => setDomain(e.target.value)}
                          placeholder="isroyal.ca"
                          className="pl-10 h-12 text-base bg-muted/20 border-border/50"
                          onKeyDown={e => e.key === "Enter" && startImport()}
                        />
                      </div>
                      <Button
                        onClick={startImport}
                        disabled={!domain.trim()}
                        className="h-12 px-6 gap-2"
                      >
                        <Search className="w-4 h-4" />
                        Analyser
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-3 gap-3 text-center text-xs text-muted-foreground">
                  {[
                    { icon: Globe, text: "Pages principales et services" },
                    { icon: MapPin, text: "Pages villes et zones" },
                    { icon: Shield, text: "Signaux de confiance" },
                  ].map((item, i) => (
                    <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card/40 border border-border/30">
                      <item.icon className="w-5 h-5 text-primary/70" />
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Phase: Crawling */}
            {phase === "crawling" && (
              <motion.div
                key="crawling"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      <span className="text-sm font-medium text-foreground">
                        Analyse en cours de <span className="text-primary">{domain}</span>
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground">{progressLabel}</p>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Découverte", done: progress >= 10 },
                    { label: "Page principale", done: progress >= 25 },
                    { label: "Pages services", done: progress >= 40 },
                    { label: "Pages villes", done: progress >= 55 },
                    { label: "Extraction IA", done: progress >= 70 },
                    { label: "Mapping", done: progress >= 85 },
                  ].map((step, i) => (
                    <div key={i} className={`flex items-center gap-2 text-xs p-2 rounded-lg transition-colors ${
                      step.done ? "text-foreground bg-primary/5" : "text-muted-foreground/50"
                    }`}>
                      {step.done ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-border/50" />
                      )}
                      {step.label}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Phase: Results */}
            {phase === "results" && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Summary */}
                {summary && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Pages trouvées", value: summary.pages_found },
                      { label: "Pages analysées", value: summary.pages_crawled },
                      { label: "Champs extraits", value: summary.fields_extracted },
                      { label: "Pages services", value: summary.service_pages },
                    ].map((stat, i) => (
                      <Card key={i} className="border-border/30 bg-card/40">
                        <CardContent className="p-3 text-center">
                          <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{stat.label}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Status bar */}
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-emerald-400">✓ {acceptedCount} acceptés</span>
                  <span className="text-muted-foreground">⏳ {pendingCount} en attente</span>
                  <span className="text-muted-foreground/50">✕ {ignoredCount} ignorés</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto text-xs h-7"
                    onClick={() => setFields(prev => prev.map(f => ({ ...f, status: "accepted" as const })))}
                  >
                    Tout accepter
                  </Button>
                </div>

                {/* Fields */}
                <div className="space-y-2">
                  {fields.map((field) => {
                    const meta = FIELD_LABELS[field.field] || { label: field.field, labelFr: field.field, icon: FileText };
                    const Icon = meta.icon;
                    const isExpanded = expandedFields.has(field.field);
                    const isSensitive = SENSITIVE_FIELDS.some(s => field.field.includes(s));
                    const displayValue = field.correctedValue ?? (
                      Array.isArray(field.value) ? field.value.join(", ") :
                      typeof field.value === "object" ? JSON.stringify(field.value) :
                      String(field.value ?? "—")
                    );

                    return (
                      <Card
                        key={field.field}
                        className={`border-border/30 transition-colors ${
                          field.status === "accepted" ? "border-emerald-500/20 bg-emerald-500/5" :
                          field.status === "corrected" ? "border-blue-500/20 bg-blue-500/5" :
                          field.status === "ignored" ? "opacity-50" : "bg-card/40"
                        }`}
                      >
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="text-xs font-medium text-foreground flex-1">{meta.labelFr}</span>
                            <span className={`text-[10px] font-mono ${confidenceColor(field.confidence)} ${confidenceBg(field.confidence)} px-1.5 py-0.5 rounded`}>
                              {Math.round(field.confidence * 100)}%
                            </span>
                            {isSensitive && (
                              <Badge variant="outline" className="text-[9px] text-amber-400 border-amber-400/30 h-5">
                                Validation requise
                              </Badge>
                            )}
                            <button onClick={() => toggleExpand(field.field)} className="text-muted-foreground hover:text-foreground">
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          <p className="text-sm text-foreground/80 line-clamp-2">{displayValue}</p>

                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              className="space-y-2 pt-2 border-t border-border/20"
                            >
                              {field.status !== "corrected" && (
                                <Input
                                  defaultValue={typeof field.value === "string" ? field.value : ""}
                                  placeholder="Corriger la valeur…"
                                  className="h-9 text-xs bg-muted/20"
                                  onBlur={e => {
                                    if (e.target.value && e.target.value !== String(field.value)) {
                                      updateFieldValue(field.field, e.target.value);
                                    }
                                  }}
                                />
                              )}
                              <p className="text-[10px] text-muted-foreground">
                                Source : {field.source_url || domain}
                              </p>
                            </motion.div>
                          )}

                          {/* Actions */}
                          <div className="flex gap-1.5 pt-1">
                            <Button
                              variant={field.status === "accepted" ? "default" : "outline"}
                              size="sm"
                              className="h-7 text-[10px] gap-1"
                              onClick={() => updateFieldStatus(field.field, "accepted")}
                            >
                              <CheckCircle2 className="w-3 h-3" /> Accepter
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[10px] gap-1"
                              onClick={() => toggleExpand(field.field)}
                            >
                              <RotateCcw className="w-3 h-3" /> Corriger
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-[10px] gap-1 text-muted-foreground"
                              onClick={() => updateFieldStatus(field.field, "ignored")}
                            >
                              <EyeOff className="w-3 h-3" /> Ignorer
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {fields.length === 0 && (
                  <Card className="border-border/30 bg-card/40">
                    <CardContent className="p-8 text-center">
                      <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
                      <p className="text-sm text-foreground font-medium">Aucun champ extrait</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Le site n'a pas retourné suffisamment de données exploitables.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Missing fields */}
                {fields.length > 0 && (
                  <Card className="border-border/30 bg-card/40">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Champs manquants à compléter</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      {Object.keys(FIELD_LABELS)
                        .filter(k => !fields.find(f => f.field === k))
                        .slice(0, 8)
                        .map(k => {
                          const meta = FIELD_LABELS[k];
                          return (
                            <div key={k} className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                              <XCircle className="w-3 h-3 text-red-400/50" />
                              {meta.labelFr}
                            </div>
                          );
                        })}
                    </CardContent>
                  </Card>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => { setPhase("input"); setFields([]); setSummary(null); }}
                    className="flex-1"
                  >
                    Recommencer
                  </Button>
                  <Button className="flex-1 gap-2" disabled={acceptedCount === 0}>
                    <ArrowRight className="w-4 h-4" />
                    Créer mon profil ({acceptedCount} champs)
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </MainLayout>
  );
}
