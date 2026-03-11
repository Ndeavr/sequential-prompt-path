import { Link } from "react-router-dom";
import ContractorLayout from "@/layouts/ContractorLayout";
import { StatCard, LoadingState, EmptyState, PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import ScoreRing from "@/components/ui/score-ring";
import { useContractorProfile, useContractorReviews, useContractorDocuments } from "@/hooks/useContractor";
import { useLeads } from "@/hooks/useLeads";
import { useAppointments } from "@/hooks/useAppointments";
import { motion } from "framer-motion";
import {
  User, Star, FileText, AlertCircle, ArrowRight, TrendingUp,
  MapPin, BarChart3, CalendarDays, Sparkles, Eye, Users, Shield, Zap, Target
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4, ease: "easeOut" as const } }),
};

const ProDashboard = () => {
  const { data: profile, isLoading: pLoading } = useContractorProfile();
  const { data: reviews, isLoading: rLoading } = useContractorReviews();
  const { data: docs, isLoading: dLoading } = useContractorDocuments();
  const { data: leads, isLoading: lLoading } = useLeads();
  const { data: appointments, isLoading: apLoading } = useAppointments();

  const isLoading = pLoading || rLoading || dLoading || lLoading || apLoading;
  if (isLoading) return <ContractorLayout><LoadingState /></ContractorLayout>;

  // Profile completeness
  const fields = [profile?.business_name, profile?.specialty, profile?.description, profile?.phone, profile?.email, profile?.city, profile?.license_number, profile?.insurance_info];
  const completeness = fields.filter(Boolean).length;
  const completenessPercent = Math.round((completeness / fields.length) * 100);

  const aippScore = profile?.aipp_score ?? 0;
  const avgRating = profile?.rating ?? 0;
  const reviewCount = reviews?.length ?? 0;
  const newLeads = (leads ?? []).length;
  const upcomingAppts = (appointments ?? []).filter(a => a.status === "scheduled" || a.status === "accepted").length;

  return (
    <ContractorLayout>
      <PageHeader
        title="Tableau de bord Pro"
        description="Votre centre de commandes entrepreneur"
        badge={profile?.verification_status === "verified" ? "Vérifié ✓" : undefined}
        action={
          <Button asChild size="sm" className="rounded-xl">
            <Link to="/pro/profile"><User className="h-4 w-4 mr-1.5" />Mon profil</Link>
          </Button>
        }
      />

      {/* ─── Incomplete Profile Alert ─── */}
      {completenessPercent < 80 && (
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show">
          <Card className="mb-5 border-0 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
            <CardContent className="pt-5 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Profil incomplet ({completenessPercent}%)</p>
                <p className="text-xs text-muted-foreground">Complétez votre profil pour maximiser votre visibilité.</p>
                <Progress value={completenessPercent} className="mt-2 h-1.5" />
              </div>
              <Button asChild size="sm" variant="outline" className="shrink-0 rounded-xl">
                <Link to="/pro/profile">Compléter</Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Stats Row ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { title: "Score AIPP", value: aippScore > 0 ? `${aippScore}/100` : "—", icon: <Sparkles className="h-4 w-4" />, trend: aippScore >= 70 ? { value: "Excellent", positive: true } : undefined },
          { title: "Leads actifs", value: newLeads, icon: <Target className="h-4 w-4" />, desc: "ce mois" },
          { title: "Avis", value: `${avgRating > 0 ? avgRating.toFixed(1) : "—"} ★`, icon: <Star className="h-4 w-4" />, desc: `${reviewCount} avis` },
          { title: "Rendez-vous", value: upcomingAppts, icon: <CalendarDays className="h-4 w-4" />, desc: "à venir" },
        ].map((s, i) => (
          <motion.div key={s.title} custom={i + 1} variants={fadeUp} initial="hidden" animate="show">
            <StatCard {...s} description={s.desc} />
          </motion.div>
        ))}
      </div>

      {/* ─── AIPP Score + Profile Strength ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <motion.div custom={5} variants={fadeUp} initial="hidden" animate="show">
          <Card className="h-full border-0 glass-card-elevated">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" /> Score AIPP
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center pt-2">
              <ScoreRing score={aippScore} size={120} strokeWidth={10} label="AIPP" />
              <div className="w-full mt-4 space-y-2">
                {[
                  { label: "Complétude", pct: completenessPercent },
                  { label: "Confiance", pct: profile?.verification_status === "verified" ? 90 : 30 },
                  { label: "Performance", pct: Math.min(100, reviewCount * 10) },
                  { label: "Visibilité", pct: 45 },
                ].map((p) => (
                  <div key={p.label} className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground w-20">{p.label}</span>
                    <Progress value={p.pct} className="h-1.5 flex-1" />
                    <span className="text-[11px] font-medium w-8 text-right">{p.pct}%</span>
                  </div>
                ))}
              </div>
              <Button asChild size="sm" variant="ghost" className="mt-3 text-primary w-full">
                <Link to="/pro/aipp-score">Améliorer mon score <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Leads */}
        <motion.div custom={6} variants={fadeUp} initial="hidden" animate="show" className="lg:col-span-2">
          <Card className="h-full border-0 glass-card-elevated">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" /> Leads récents
              </CardTitle>
              <Button asChild size="sm" variant="ghost" className="text-primary h-8 text-xs">
                <Link to="/pro/leads">Tout voir <ArrowRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            </CardHeader>
            <CardContent>
              {!leads?.length ? (
                <EmptyState message="Aucun lead pour le moment. Complétez votre profil et vos territoires pour recevoir des demandes." />
              ) : (
                <div className="space-y-2">
                  {leads.slice(0, 5).map((l) => (
                    <Link key={l.id} to={`/pro/leads/${l.id}`} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/40 transition-colors group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-xl bg-primary/8 flex items-center justify-center">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{l.project_category || "Projet"}</p>
                          <p className="text-[11px] text-muted-foreground">{l.city || "—"} · {l.budget_range || "Budget flexible"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-success" />
                          <span className="text-xs font-semibold">{l.score}</span>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ─── Appointments + Reviews ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <motion.div custom={7} variants={fadeUp} initial="hidden" animate="show">
          <Card className="border-0 glass-card-elevated h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Rendez-vous</CardTitle>
              <Button asChild size="sm" variant="ghost" className="text-primary h-8 text-xs">
                <Link to="/pro/appointments">Gérer <ArrowRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            </CardHeader>
            <CardContent>
              {!appointments?.length ? (
                <EmptyState message="Aucun rendez-vous planifié." />
              ) : (
                <ul className="space-y-1.5">
                  {appointments.slice(0, 4).map((a) => (
                    <li key={a.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-muted/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${a.status === "scheduled" ? "bg-success/10 text-success" : a.status === "requested" ? "bg-amber-500/10 text-amber-600" : "bg-muted text-muted-foreground"}`}>
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

        <motion.div custom={8} variants={fadeUp} initial="hidden" animate="show">
          <Card className="border-0 glass-card-elevated h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Avis récents</CardTitle>
              <Button asChild size="sm" variant="ghost" className="text-primary h-8 text-xs">
                <Link to="/pro/reviews">Tout voir <ArrowRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            </CardHeader>
            <CardContent>
              {!reviews?.length ? (
                <EmptyState message="Aucun avis pour le moment." />
              ) : (
                <ul className="space-y-2">
                  {reviews.slice(0, 4).map((r) => (
                    <li key={r.id} className="p-3 rounded-xl hover:bg-muted/40 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-3 w-3 ${i < r.rating ? "text-amber-400 fill-amber-400" : "text-muted"}`} />
                          ))}
                        </div>
                        {r.title && <span className="text-xs font-medium truncate">{r.title}</span>}
                      </div>
                      {r.content && <p className="text-[11px] text-muted-foreground line-clamp-2">{r.content}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ─── Visibility + Service Areas ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <motion.div custom={9} variants={fadeUp} initial="hidden" animate="show">
          <Card className="border-0 glass-card-elevated">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" /> Visibilité
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { label: "Vues du profil", value: "—", change: null },
                  { label: "Apparitions recherche", value: "—", change: null },
                  { label: "Taux de clic", value: "—", change: null },
                  { label: "Demandes reçues", value: String(newLeads), change: newLeads > 0 ? "+new" : null },
                ].map((m) => (
                  <div key={m.label} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{m.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{m.value}</span>
                      {m.change && <Badge variant="secondary" className="text-[10px]">{m.change}</Badge>}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-4 text-center">Les analytiques détaillées seront disponibles prochainement.</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div custom={10} variants={fadeUp} initial="hidden" animate="show">
          <Card className="border-0 glass-card-elevated">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> Zones de service
              </CardTitle>
              <Button asChild size="sm" variant="ghost" className="text-primary h-8 text-xs">
                <Link to="/pro/territories">Gérer <ArrowRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center py-6 text-center">
                <div className="h-14 w-14 rounded-2xl bg-primary/8 flex items-center justify-center mb-3">
                  <MapPin className="h-6 w-6 text-primary/60" />
                </div>
                <p className="text-sm text-muted-foreground mb-3">Définissez vos territoires pour apparaître dans les recherches locales</p>
                <Button asChild size="sm" variant="outline" className="rounded-xl">
                  <Link to="/pro/territories">Configurer mes zones</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ─── Quick Actions ─── */}
      <motion.div custom={11} variants={fadeUp} initial="hidden" animate="show">
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-xl"><Link to="/pro/profile">Modifier profil</Link></Button>
          <Button asChild variant="outline" size="sm" className="rounded-xl"><Link to="/pro/documents">Mes documents</Link></Button>
          <Button asChild variant="outline" size="sm" className="rounded-xl"><Link to="/pro/billing">Facturation</Link></Button>
        </div>
      </motion.div>
    </ContractorLayout>
  );
};

export default ProDashboard;
