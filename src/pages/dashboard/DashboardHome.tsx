import { Link } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import { StatCard, EmptyState, LoadingState, PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import ScoreRing from "@/components/ui/score-ring";
import { useProperties } from "@/hooks/useProperties";
import { useQuotes } from "@/hooks/useQuotes";
import { useAppointments } from "@/hooks/useAppointments";
import { calculateHomeScore } from "@/services/homeScoreService";
import { motion } from "framer-motion";
import {
  Home, FileText, BarChart3, Plus, CalendarDays, Sparkles,
  ArrowRight, Star, Shield, Clock, Upload, TrendingUp, Building2, BrainCircuit
} from "lucide-react";
import BannerCalendarMissingWarning from "@/components/calendar/BannerCalendarMissingWarning";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4, ease: "easeOut" as const } }),
};

const Dashboard = () => {
  const { data: properties, isLoading: pLoading } = useProperties();
  const { data: quotes, isLoading: qLoading } = useQuotes();
  const { data: appointments, isLoading: aLoading } = useAppointments();

  const isLoading = pLoading || qLoading || aLoading;

  const bestScore = (properties ?? []).reduce((best, p) => {
    const s = calculateHomeScore({
      yearBuilt: p.year_built, propertyType: p.property_type, squareFootage: p.square_footage,
      condition: p.condition, hasInspectionReports: false, uploadedDocumentCount: 0,
      quoteCount: 0, renovationCount: 0, recentRepairCount: 0,
    });
    return s.overall > best ? s.overall : best;
  }, 0);

  const pendingQuotes = (quotes ?? []).filter(q => q.status === "pending").length;
  const analyzedQuotes = (quotes ?? []).filter(q => q.status === "analyzed").length;
  const upcomingAppts = (appointments ?? []).filter(a => a.status === "scheduled" || a.status === "accepted").length;

  if (isLoading) return <DashboardLayout><LoadingState /></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="mb-4">
        <BannerCalendarMissingWarning role="homeowner" />
      </div>
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble de vos propriétés et projets"
        action={
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline" className="rounded-xl">
              <Link to="/dashboard/quotes/upload"><Upload className="h-4 w-4 mr-1.5" />Soumission</Link>
            </Button>
            <Button asChild size="sm" className="rounded-xl">
              <Link to="/dashboard/properties/new"><Plus className="h-4 w-4 mr-1.5" />Propriété</Link>
            </Button>
          </div>
        }
      />

      {/* ─── Stats Row ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { title: "Propriétés", value: properties?.length ?? 0, icon: <Building2 className="h-4 w-4" />, desc: "actives" },
          { title: "Soumissions", value: quotes?.length ?? 0, icon: <FileText className="h-4 w-4" />, trend: pendingQuotes > 0 ? { value: `${pendingQuotes} en attente`, positive: true } : undefined },
          { title: "Rendez-vous", value: upcomingAppts, icon: <CalendarDays className="h-4 w-4" />, desc: "à venir" },
          { title: "Score maison", value: bestScore > 0 ? `${bestScore}/100` : "—", icon: <BarChart3 className="h-4 w-4" /> },
        ].map((s, i) => (
          <motion.div key={s.title} custom={i} variants={fadeUp} initial="hidden" animate="show">
            <StatCard {...s} description={s.desc} />
          </motion.div>
        ))}
      </div>

      {/* ─── Home Score + AI Analysis ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show" className="lg:col-span-1">
          <Card className="h-full border-0 glass-card-elevated">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Score maison</CardTitle>
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="flex flex-col items-center pt-2">
              <ScoreRing score={bestScore || 0} size={120} strokeWidth={10} label="Global" />
              <p className="text-meta text-muted-foreground mt-3 text-center">
                {bestScore >= 70 ? "Votre propriété est en excellent état !" : bestScore > 0 ? "Des améliorations sont recommandées." : "Ajoutez une propriété pour calculer votre score."}
              </p>
              <Button asChild size="sm" variant="ghost" className="mt-3 text-primary">
                <Link to="/dashboard/home-score">Voir les détails <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div custom={5} variants={fadeUp} initial="hidden" animate="show" className="lg:col-span-2">
          <Card className="h-full border-0 glass-card-elevated">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <BrainCircuit className="h-4 w-4 text-primary" /> Analyse IA
                </CardTitle>
                <Badge variant="secondary" className="text-[10px]">{analyzedQuotes} analysée{analyzedQuotes !== 1 ? "s" : ""}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {!quotes?.length ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <div className="h-12 w-12 rounded-2xl bg-primary/8 flex items-center justify-center mb-3">
                    <FileText className="h-5 w-5 text-primary/60" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">Téléversez une soumission pour obtenir une analyse IA gratuite</p>
                  <Button asChild size="sm" variant="outline" className="rounded-xl">
                    <Link to="/dashboard/quotes/upload"><Upload className="h-3.5 w-3.5 mr-1.5" />Téléverser</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {quotes.slice(0, 4).map((q) => (
                    <Link key={q.id} to={`/dashboard/quotes/${q.id}`} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/40 transition-colors group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${q.status === "analyzed" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                          {q.status === "analyzed" ? <Sparkles className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{q.title}</p>
                          <p className="text-[11px] text-muted-foreground">{q.amount ? `${q.amount.toLocaleString()} $` : "—"}</p>
                        </div>
                      </div>
                      <Badge variant={q.status === "analyzed" ? "default" : "secondary"} className="text-[10px] shrink-0">
                        {q.status === "analyzed" ? "Analysée" : q.status === "pending" ? "En attente" : q.status}
                      </Badge>
                    </Link>
                  ))}
                  {(quotes?.length ?? 0) > 4 && (
                    <Button asChild variant="ghost" size="sm" className="w-full text-primary">
                      <Link to="/dashboard/quotes">Voir les {quotes.length} soumissions <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ─── Properties + Appointments ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <motion.div custom={6} variants={fadeUp} initial="hidden" animate="show">
          <Card className="border-0 glass-card-elevated h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Propriétés</CardTitle>
              <Button asChild size="sm" variant="ghost" className="text-primary h-8 text-xs">
                <Link to="/dashboard/properties"><span>Tout voir</span><ArrowRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            </CardHeader>
            <CardContent>
              {!properties?.length ? (
                <EmptyState message="Aucune propriété ajoutée." action={<Button asChild variant="outline" size="sm" className="rounded-xl"><Link to="/dashboard/properties/new"><Plus className="h-3.5 w-3.5 mr-1" />Ajouter</Link></Button>} />
              ) : (
                <ul className="space-y-1.5">
                  {properties.slice(0, 5).map((p) => (
                    <li key={p.id}>
                      <Link to={`/dashboard/properties/${p.id}`} className="flex justify-between items-center py-2.5 px-3 rounded-xl hover:bg-muted/40 transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-primary/8 flex items-center justify-center">
                            <Home className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div>
                            <span className="text-sm font-medium group-hover:text-primary transition-colors">{p.address}</span>
                            <p className="text-[11px] text-muted-foreground">{p.city}</p>
                          </div>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div custom={7} variants={fadeUp} initial="hidden" animate="show">
          <Card className="border-0 glass-card-elevated h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Rendez-vous</CardTitle>
              <Button asChild size="sm" variant="ghost" className="text-primary h-8 text-xs">
                <Link to="/dashboard/appointments"><span>Tout voir</span><ArrowRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            </CardHeader>
            <CardContent>
              {!appointments?.length ? (
                <EmptyState message="Aucun rendez-vous planifié." action={<Button asChild variant="outline" size="sm" className="rounded-xl"><Link to="/search">Trouver un pro</Link></Button>} />
              ) : (
                <ul className="space-y-1.5">
                  {appointments.slice(0, 4).map((a) => (
                    <li key={a.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-muted/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${a.status === "scheduled" ? "bg-success/10 text-success" : "bg-accent/10 text-accent"}`}>
                          <CalendarDays className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{a.project_category || "Rendez-vous"}</p>
                          <p className="text-[11px] text-muted-foreground">{a.preferred_date || "Date à confirmer"}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] capitalize">{a.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ─── Recommended Contractors ─── */}
      <motion.div custom={8} variants={fadeUp} initial="hidden" animate="show" className="mb-6">
        <Card className="border-0 glass-card-elevated">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" /> Entrepreneurs recommandés
            </CardTitle>
            <Button asChild size="sm" variant="ghost" className="text-primary h-8 text-xs">
              <Link to="/search">Explorer <ArrowRight className="h-3 w-3 ml-1" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { name: "Toitures Québec Pro", specialty: "Toiture", score: 92, reviews: 47 },
                { name: "Plomberie Montréal", specialty: "Plomberie", score: 88, reviews: 31 },
                { name: "Électricité Laval", specialty: "Électricité", score: 85, reviews: 28 },
              ].map((c) => (
                <div key={c.name} className="p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                      <Shield className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold group-hover:text-primary transition-colors">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground">{c.specialty}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-success" />
                      <span className="text-xs font-semibold text-success">{c.score}</span>
                      <span className="text-[10px] text-muted-foreground">AIPP</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                      <span className="text-xs text-muted-foreground">{c.reviews} avis</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Quick Actions ─── */}
      <motion.div custom={9} variants={fadeUp} initial="hidden" animate="show">
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-xl"><Link to="/search">Trouver un entrepreneur</Link></Button>
          <Button asChild variant="outline" size="sm" className="rounded-xl"><Link to="/dashboard/home-score">Voir mon score</Link></Button>
          <Button asChild variant="outline" size="sm" className="rounded-xl"><Link to="/describe-project">Décrire un projet</Link></Button>
        </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default Dashboard;
