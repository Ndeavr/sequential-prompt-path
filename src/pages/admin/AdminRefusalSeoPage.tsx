/**
 * UNPRO — Admin Refusal SEO Dashboard
 * Monitor signals, approve/publish pages, track feedback loop.
 */
import AdminLayout from "@/layouts/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useRefusalSignals,
  useRefusalSeoPages,
  useRefusalSeoStats,
  useUpdateRefusalPageStatus,
} from "@/hooks/useRefusalSeo";
import { Brain, FileText, BarChart3, Eye, Check, X, Signal, TrendingUp, ArrowRight } from "lucide-react";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  review: "bg-amber-500/10 text-amber-600",
  published: "bg-primary/10 text-primary",
  archived: "bg-destructive/10 text-destructive",
};

const AdminRefusalSeoPage = () => {
  const { data: stats, isLoading: loadingStats } = useRefusalSeoStats();
  const { data: signals = [], isLoading: loadingSignals } = useRefusalSignals();
  const { data: pages = [], isLoading: loadingPages } = useRefusalSeoPages();
  const statusMutation = useUpdateRefusalPageStatus();

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Moteur SEO par refus
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Signaux de refus → Pages SEO → Trafic → Leads · Boucle autonome
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {loadingStats ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
          ) : (
            <>
              <Card className="border-border/30">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Signal className="h-3.5 w-3.5" /> Signaux captés
                  </div>
                  <div className="text-2xl font-bold text-foreground">{stats?.totalSignals || 0}</div>
                </CardContent>
              </Card>
              <Card className="border-border/30">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <FileText className="h-3.5 w-3.5" /> Pages générées
                  </div>
                  <div className="text-2xl font-bold text-foreground">{stats?.totalPages || 0}</div>
                </CardContent>
              </Card>
              <Card className="border-border/30">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Check className="h-3.5 w-3.5" /> Publiées
                  </div>
                  <div className="text-2xl font-bold text-primary">{stats?.publishedPages || 0}</div>
                </CardContent>
              </Card>
              <Card className="border-border/30">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <TrendingUp className="h-3.5 w-3.5" /> Boucle active
                  </div>
                  <div className="text-2xl font-bold text-primary flex items-center gap-1">
                    <ArrowRight className="h-4 w-4" /> Oui
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <Tabs defaultValue="pages" className="w-full">
          <TabsList className="grid grid-cols-3 h-9 rounded-xl w-full max-w-sm">
            <TabsTrigger value="pages" className="text-xs gap-1 rounded-lg">
              <FileText className="h-3.5 w-3.5" /> Pages
            </TabsTrigger>
            <TabsTrigger value="signals" className="text-xs gap-1 rounded-lg">
              <Signal className="h-3.5 w-3.5" /> Signaux
            </TabsTrigger>
            <TabsTrigger value="loop" className="text-xs gap-1 rounded-lg">
              <BarChart3 className="h-3.5 w-3.5" /> Boucle
            </TabsTrigger>
          </TabsList>

          {/* Pages Tab */}
          <TabsContent value="pages" className="mt-4">
            {loadingPages ? (
              <Skeleton className="h-40 w-full rounded-xl" />
            ) : pages.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Aucune page générée pour l'instant.</CardContent></Card>
            ) : (
              <div className="rounded-xl border border-border/30 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">H1</TableHead>
                      <TableHead className="text-xs">Ville</TableHead>
                      <TableHead className="text-xs">Signaux</TableHead>
                      <TableHead className="text-xs">Score</TableHead>
                      <TableHead className="text-xs">Statut</TableHead>
                      <TableHead className="text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pages.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs font-medium max-w-[200px] truncate">{p.h1}</TableCell>
                        <TableCell className="text-xs">{p.city_name || "—"}</TableCell>
                        <TableCell className="text-xs">{p.signal_count}</TableCell>
                        <TableCell className="text-xs">{Math.round(p.demand_score)}</TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] ${statusColors[p.status] || ""}`}>{p.status}</Badge>
                        </TableCell>
                        <TableCell className="flex gap-1">
                          {p.status === "draft" && (
                            <Button size="sm" variant="outline" className="h-7 text-xs"
                              onClick={() => statusMutation.mutate({ id: p.id, status: "review" })}>
                              Réviser
                            </Button>
                          )}
                          {p.status === "review" && (
                            <>
                              <Button size="sm" className="h-7 text-xs"
                                onClick={() => statusMutation.mutate({ id: p.id, status: "published" })}>
                                <Check className="h-3 w-3 mr-1" /> Publier
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs"
                                onClick={() => statusMutation.mutate({ id: p.id, status: "archived" })}>
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                          {p.status === "published" && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
                              <a href={`/refusal/${p.slug}`} target="_blank" rel="noopener">
                                <Eye className="h-3 w-3 mr-1" /> Voir
                              </a>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Signals Tab */}
          <TabsContent value="signals" className="mt-4">
            {loadingSignals ? (
              <Skeleton className="h-40 w-full rounded-xl" />
            ) : signals.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Aucun signal de refus capté.</CardContent></Card>
            ) : (
              <div className="rounded-xl border border-border/30 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Signal</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Problème</TableHead>
                      <TableHead className="text-xs">Ville</TableHead>
                      <TableHead className="text-xs">Fréq.</TableHead>
                      <TableHead className="text-xs">Confiance</TableHead>
                      <TableHead className="text-xs">Page</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {signals.slice(0, 50).map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="text-xs max-w-[200px] truncate">{s.signal_text}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{s.refusal_type}</Badge></TableCell>
                        <TableCell className="text-xs">{s.problem_slug || "—"}</TableCell>
                        <TableCell className="text-xs">{s.city_slug || "—"}</TableCell>
                        <TableCell className="text-xs font-medium">{s.frequency}</TableCell>
                        <TableCell className="text-xs">{Math.round(s.confidence * 100)}%</TableCell>
                        <TableCell>
                          {s.seo_opportunity_generated ? (
                            <Badge className="text-[10px] bg-primary/10 text-primary">Oui</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">Non</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Feedback Loop Tab */}
          <TabsContent value="loop" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Boucle de rétroaction</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center gap-3 py-6">
                  {[
                    { icon: "🔴", label: "Refus d'entrepreneur", detail: "Signaux captés automatiquement" },
                    { icon: "📊", label: "Analyse de patterns", detail: "Regroupement par problème × ville × matériau" },
                    { icon: "📄", label: "Génération de page SEO", detail: "Contenu ultra-précis optimisé AEO/GEO" },
                    { icon: "🔍", label: "Trafic organique", detail: "Google, ChatGPT, Perplexity, Gemini" },
                    { icon: "📞", label: "Leads qualifiés", detail: "Rendez-vous exclusifs vers le bon spécialiste" },
                    { icon: "🔄", label: "Plus de données", detail: "Nouveaux refus → nouvelles pages" },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-3 w-full max-w-md">
                      <span className="text-2xl">{step.icon}</span>
                      <div>
                        <div className="text-sm font-medium text-foreground">{step.label}</div>
                        <div className="text-xs text-muted-foreground">{step.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminRefusalSeoPage;
