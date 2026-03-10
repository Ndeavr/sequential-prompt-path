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
} from "lucide-react";
import ShareAnalysis from "@/components/growth/ShareAnalysis";

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

const ScoreBadge = ({ score }: { score: number | null }) => {
  if (score == null) return null;
  const color =
    score >= 70
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      : score >= 45
      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${color}`}>
      {score}/100
    </span>
  );
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
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-current flex-shrink-0" />
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
        <Button asChild variant="outline">
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
          <Button asChild variant="ghost" size="sm">
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
          <Badge variant={statusVariant[quote.status ?? "pending"]}>{quote.status}</Badge>
        </div>

        {/* Quote summary card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" /> Résumé de la soumission
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Montant</p>
              <p className="font-semibold">{quote.amount ? `${quote.amount.toLocaleString("fr-CA")} $` : "Non précisé"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Propriété</p>
              <p className="font-semibold">{(quote as any).properties?.address || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Document</p>
              <p className="font-semibold">{quote.file_url ? "Oui" : "Non"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Date</p>
              <p className="font-semibold">{format(new Date(quote.created_at), "dd/MM/yyyy")}</p>
            </div>
            {quote.description && (
              <div className="col-span-2 sm:col-span-4">
                <p className="text-muted-foreground">Description</p>
                <p>{quote.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analysis */}
        {analysis ? (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Analyse de la soumission</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant[analysis.status ?? "pending"]}>
                      {statusLabel[analysis.status ?? "pending"] ?? analysis.status}
                    </Badge>
                    <ScoreBadge score={analysis.fairness_score} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {analysis.summary && <p className="text-sm">{analysis.summary}</p>}
                {analysis.ai_model === "temp-deterministic-v1" && (
                  <p className="text-xs text-muted-foreground italic">
                    Analyse préliminaire automatique — une analyse approfondie par IA sera disponible prochainement.
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <AnalysisSection
                    icon={CheckCircle}
                    title="Ce qui semble bon"
                    items={strengths}
                    emptyText="Aucun point positif identifié."
                    className="text-green-700 dark:text-green-400"
                  />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <AnalysisSection
                    icon={AlertTriangle}
                    title="Points à vérifier"
                    items={concerns}
                    emptyText="Aucune préoccupation identifiée."
                    className="text-yellow-700 dark:text-yellow-400"
                  />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <AnalysisSection
                    icon={HelpCircle}
                    title="Éléments souvent oubliés"
                    items={missingItems}
                    emptyText="Tous les éléments courants semblent présents."
                    className="text-orange-700 dark:text-orange-400"
                  />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-blue-700 dark:text-blue-400">
                    <h3 className="flex items-center gap-2 font-semibold text-base mb-3">
                      <Lightbulb className="h-5 w-5" /> Prochaines étapes recommandées
                    </h3>
                    {analysis.recommendations ? (
                      <p className="text-sm text-muted-foreground">{analysis.recommendations}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Aucune recommandation pour le moment.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Aucune analyse disponible pour cette soumission.
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* CTAs */}
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link to="/dashboard/quotes/upload">
              <Upload className="h-4 w-4 mr-1" /> Téléverser une autre soumission
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/search">
              <Search className="h-4 w-4 mr-1" /> Voir les entrepreneurs
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to="/dashboard/quotes">
              <ArrowLeft className="h-4 w-4 mr-1" /> Toutes les soumissions
            </Link>
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default QuoteDetail;
