/**
 * UNPRO — Passeport Maison Dashboard Page
 * Owner-only property passport with completion engine, sections, and next actions.
 */
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/layouts/DashboardLayout";
import { PageHeader, LoadingState, ErrorState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useProperty } from "@/hooks/useProperties";
import { getPassportOverview, getLevelBadge, type PassportOverview } from "@/services/property/passportService";
import { getNextTasks, getCompletionStats, seedCompletionTasks, completeTask, dismissTask, type CompletionTask } from "@/services/property/completionEngine";
import { submitClaim, getClaimStatusLabel } from "@/services/property/claimService";
import { getStatusLabel } from "@/services/property/propertyService";
import { useToast } from "@/hooks/use-toast";
import {
  Home, Wrench, Hammer, Zap, FileText, ShieldCheck,
  CheckCircle2, X, Clock, ArrowRight, Sparkles, Trophy,
  ChevronRight, MapPin, BarChart3,
} from "lucide-react";

const SECTION_ICONS: Record<string, React.ElementType> = {
  Home, Wrench, Hammer, Zap, FileText,
};

export default function PropertyPassportPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: property, isLoading: propLoading } = useProperty(id);

  // Seed tasks on first load
  const { data: seeded } = useQuery({
    queryKey: ["seed-tasks", id],
    queryFn: async () => {
      await seedCompletionTasks(id!);
      return true;
    },
    enabled: !!id,
    staleTime: Infinity,
  });

  const { data: passport, isLoading: passportLoading } = useQuery({
    queryKey: ["passport", id],
    queryFn: () => getPassportOverview(id!),
    enabled: !!id && !!seeded,
  });

  const { data: nextTasks } = useQuery({
    queryKey: ["next-tasks", id],
    queryFn: () => getNextTasks(id!, 3),
    enabled: !!id && !!seeded,
  });

  const { data: stats } = useQuery({
    queryKey: ["completion-stats", id],
    queryFn: () => getCompletionStats(id!),
    enabled: !!id && !!seeded,
  });

  const completeMutation = useMutation({
    mutationFn: completeTask,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["next-tasks", id] });
      qc.invalidateQueries({ queryKey: ["completion-stats", id] });
      qc.invalidateQueries({ queryKey: ["passport", id] });
      toast({ title: "Tâche complétée ✓", description: "Bravo! Votre passeport progresse." });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: dismissTask,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["next-tasks", id] });
      qc.invalidateQueries({ queryKey: ["completion-stats", id] });
    },
  });

  const claimMutation = useMutation({
    mutationFn: () => submitClaim({ propertyId: id!, userId: user!.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["property", id] });
      toast({ title: "Demande envoyée", description: "Votre réclamation est en cours de traitement." });
    },
    onError: (err: Error) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  if (propLoading || passportLoading) return <DashboardLayout><LoadingState /></DashboardLayout>;
  if (!property) return <DashboardLayout><ErrorState message="Propriété introuvable." /></DashboardLayout>;

  const isOwner = property.user_id === user?.id || property.claimed_by === user?.id;
  const status = getStatusLabel(property.public_status);
  const claimStatus = getClaimStatusLabel((property.claim_status || "unclaimed") as any);
  const levelBadge = passport ? getLevelBadge(passport.level) : null;

  return (
    <DashboardLayout>
      <PageHeader
        title="Passeport Maison"
        description={property.full_address || property.address}
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to={`/dashboard/properties/${id}`}>← Détails</Link>
            </Button>
            {property.slug && (
              <Button asChild variant="ghost" size="sm">
                <Link to={`/maison/${property.slug}`}>Page publique</Link>
              </Button>
            )}
          </div>
        }
      />

      <div className="space-y-6 max-w-3xl">
        {/* Claim Banner — show if not owner */}
        {!isOwner && (
          <Card className="border-primary/20 bg-primary/[0.03]">
            <CardContent className="p-5 flex items-center gap-4">
              <ShieldCheck className="h-8 w-8 text-primary shrink-0" />
              <div className="flex-1">
                <h3 className="font-display font-semibold text-foreground">Réclamez cette propriété</h3>
                <p className="text-sm text-muted-foreground">Devenez propriétaire vérifié pour accéder au Passeport Maison complet.</p>
              </div>
              <Button onClick={() => claimMutation.mutate()} disabled={claimMutation.isPending} size="sm">
                Réclamer
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Completion Score Card */}
        <Card className="border-border/50 shadow-[var(--shadow-lg)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <Trophy className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    Complétion du Passeport
                  </h2>
                  {levelBadge && passport && (
                    <span className={`text-sm ${levelBadge.color}`}>
                      {levelBadge.emoji} Niveau : {passport.level}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="font-display text-3xl font-bold text-primary">
                  {stats?.pct ?? 0}%
                </span>
                <p className="text-xs text-muted-foreground">
                  {stats?.earnedPoints ?? 0} / {stats?.totalPoints ?? 0} pts
                </p>
              </div>
            </div>
            <Progress value={stats?.pct ?? 0} className="h-2.5" />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{stats?.completed ?? 0} complétées sur {stats?.total ?? 0}</span>
              <span>{(stats?.total ?? 0) - (stats?.completed ?? 0) - (stats?.dismissed ?? 0)} restantes</span>
            </div>
          </CardContent>
        </Card>

        {/* Next Actions */}
        {nextTasks && nextTasks.length > 0 && (
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Prochaines actions recommandées
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {nextTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{task.title_fr}</p>
                    {task.description_fr && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.description_fr}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> ~{task.estimated_minutes} min
                      </span>
                      <Badge variant="secondary" className="text-xs px-1.5 py-0">
                        +{task.points} pts
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground"
                      onClick={() => dismissMutation.mutate(task.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 gap-1"
                      onClick={() => completeMutation.mutate(task.id)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Fait
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Passport Sections */}
        <div className="space-y-3">
          <h3 className="font-display text-base font-semibold text-foreground px-1">
            Sections du Passeport
          </h3>
          {passport?.sections.map((section) => {
            const Icon = SECTION_ICONS[section.icon] || Home;
            return (
              <Card key={section.key} className="border-border/40 hover:shadow-[var(--shadow-md)] transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-muted/50 shrink-0">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{section.label}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Progress value={section.completionPct} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground w-8 text-right">
                        {section.completionPct}%
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Badge variant={status.color}>{status.label}</Badge>
          <Badge variant={claimStatus.color}>{claimStatus.label}</Badge>
        </div>
      </div>
    </DashboardLayout>
  );
}
