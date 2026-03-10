import { useParams, Link } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import { PageHeader, LoadingState } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useQuote, useQuoteAnalysis } from "@/hooks/useQuotes";
import { format } from "date-fns";
import {
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  Lightbulb,
  ArrowLeft,
  Upload,
  Search,
  FileText,
  ArrowRight,
} from "lucide-react";
import ShareAnalysis from "@/components/growth/ShareAnalysis";
import ScoreRing from "@/components/ui/score-ring";
import { motion } from "framer-motion";

const statusLabel: Record<string, string> = {
  pending: "En attente",
  processing: "En cours",
  completed: "Complétée",
  failed: "Échouée",
};

const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
  pending: "secondary",
  processing: "secondary",
  completed: "default",
  failed: "destructive",
};

const AnalysisSection = ({
  icon: Icon,
  title,
  items,
  emptyText,
  className,
}: {
  icon: React.ElementType;
  title: string;
  items: string[];
  emptyText: string;
  className?: string;
}) => (
  <div className={className}>
    <h3 className="flex items-center gap-2 font-semibold text-base mb-3">
      <Icon className="h-5 w-5" />
      {title}
    </h3>
    {items.length > 0 ? (
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2 leading-relaxed">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-current flex-shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-sm text-muted-foreground">{emptyText}</p>
    )}
  </div>
);

const QuoteDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data: quote, isLoading } = useQuote(id);
  const { data: analysis, isLoading: analysisLoading } = useQuoteAnalysis(id);

  if (isLoading || analysisLoading) {
    return (
      <DashboardLayout>
        <LoadingState />
      </DashboardLayout>
    );
  }

  if (!quote) {
    return (
      <DashboardLayout>
        <PageHeader title="Soumission introuvable" />
        <Button asChild variant="outline" className="rounded-xl">
          <Link to="/dashboard/quotes">
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour
          </Link>
        </Button>
      </DashboardLayout>
    );
  }

  const strengths: string[] = Array.isArray(analysis?.strengths) ? (analysis.strengths as string[]) : [];
  const concerns: string[] = Array.isArray(analysis?.concerns) ? (analysis.concerns as string[]) : [];
  const missingItems: string[] = Array.isArray(analysis?.missing_items) ? (analysis.missing_items as string[]) : [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="rounded-xl">
            <Link to="/dashboard/quotes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{quote.title}</h1>
            <p className="text-muted-foreground text-sm">
              {(quote as any).properties?.address || "Propriété"} · {format(new Date(quote.created_at), "dd/MM/yyyy")}
            </p>
          </div>
          <Badge variant={statusVariant[quote.status ?? "pending"]} className="rounded-full">{quote.status}</Badge>
        </div>

        {/* Quote summary card */}
        <Card className="glass-card border-0 shadow-soft">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" /> Résumé de la soumission
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-meta">Montant</p>
              <p className="font-semibold">{quote.amount ? `${quote.amount.toLocaleString("fr-CA")} $` : "Non précisé"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-meta">Propriété</p>
              <p className="font-semibold">{(quote as any).properties?.address || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-meta">Document</p>
              <p className="font-semibold">{quote.file_url ? "Oui" : "Non"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-meta">Date</p>
              <p className="font-semibold">{format(new Date(quote.created_at), "dd/MM/yyyy")}</p>
            </div>
            {quote.description && (
              <div className="col-span-2 sm:col-span-4">
                <p className="text-muted-foreground text-meta">Description</p>
                <p className="leading-relaxed">{quote.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analysis */}
        {analysis ? (
          <>
            {/* Score hero */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="glass-card border-0 shadow-elevation">
                <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-6">
                  <ScoreRing score={analysis.fairness_score ?? 0} size={100} strokeWidth={8} label="Équité" />
                  <div className="flex-1 text-center sm:text-left">
                    <CardTitle className="text-base mb-2">Analyse de la soumission</CardTitle>
                    {analysis.summary && <p className="text-sm text-muted-foreground leading-relaxed">{analysis.summary}</p>}
                    {analysis.ai_model === "temp-deterministic-v1" && (
                      <p className="text-xs text-muted-foreground italic mt-2">
                        Analyse préliminaire automatique — une analyse approfondie sera disponible prochainement.
                      </p>
                    )}
                  </div>
                  <Badge variant={statusVariant[analysis.status ?? "pending"]} className="rounded-full shrink-0">
                    {statusLabel[analysis.status ?? "pending"] ?? analysis.status}
                  </Badge>
                </CardContent>
              </Card>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="glass-card border-0 shadow-soft">
                <CardContent className="pt-6">
                  <AnalysisSection
                    icon={CheckCircle}
                    title="Ce qui semble bon"
                    items={strengths}
                    emptyText="Aucun point positif identifié."
                    className="text-success"
                  />
                </CardContent>
              </Card>
              <Card className="glass-card border-0 shadow-soft">
                <CardContent className="pt-6">
                  <AnalysisSection
                    icon={AlertTriangle}
                    title="Points à vérifier"
                    items={concerns}
                    emptyText="Aucune préoccupation identifiée."
                    className="text-accent-foreground"
                  />
                </CardContent>
              </Card>
              <Card className="glass-card border-0 shadow-soft">
                <CardContent className="pt-6">
                  <AnalysisSection
                    icon={HelpCircle}
                    title="Éléments souvent oubliés"
                    items={missingItems}
                    emptyText="Tous les éléments courants semblent présents."
                    className="text-orange-600 dark:text-orange-400"
                  />
                </CardContent>
              </Card>
              <Card className="glass-card border-0 shadow-soft">
                <CardContent className="pt-6">
                  <div className="text-primary">
                    <h3 className="flex items-center gap-2 font-semibold text-base mb-3">
                      <Lightbulb className="h-5 w-5" /> Prochaines étapes recommandées
                    </h3>
                    {analysis.recommendations ? (
                      <p className="text-sm text-muted-foreground leading-relaxed">{analysis.recommendations}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Aucune recommandation pour le moment.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <Card className="glass-card border-0 shadow-soft">
            <CardContent className="py-10 text-center text-muted-foreground">
              Aucune analyse disponible pour cette soumission.
            </CardContent>
          </Card>
        )}

        <Separator className="bg-border/50" />

        {/* CTAs */}
        <div className="flex flex-wrap gap-3">
          {analysis && (
            <ShareAnalysis
              quoteId={quote.id}
              fairnessScore={analysis.fairness_score}
              amount={quote.amount}
            />
          )}
          <Button asChild variant="outline" className="rounded-xl gap-1">
            <Link to="/dashboard/quotes/upload">
              <Upload className="h-4 w-4" /> Téléverser une autre soumission
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl gap-1">
            <Link to="/search">
              <Search className="h-4 w-4" /> Voir les entrepreneurs
            </Link>
          </Button>
          <Button asChild variant="ghost" className="rounded-xl gap-1">
            <Link to="/dashboard/quotes">
              <ArrowLeft className="h-4 w-4" /> Toutes les soumissions
            </Link>
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default QuoteDetail;
