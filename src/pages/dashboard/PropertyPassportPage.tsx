/**
 * UNPRO — Passeport Maison Dashboard Page (V2)
 * Full Home Passport Engine with 6 modules:
 * 1. Property Identity  2. System Inventory  3. Renovation History
 * 4. Maintenance Log  5. Document Vault  6. Home Score
 */
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/layouts/DashboardLayout";
import { PageHeader, LoadingState, ErrorState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useProperty } from "@/hooks/useProperties";
import { getPassportOverview, getLevelBadge, type PassportOverview } from "@/services/property/passportService";
import { getNextTasks, getCompletionStats, seedCompletionTasks, completeTask, dismissTask, type CompletionTask } from "@/services/property/completionEngine";
import { submitClaim, getClaimStatusLabel } from "@/services/property/claimService";
import { getStatusLabel } from "@/services/property/propertyService";
import { calculateHomeScore, type HomeScoreInput, type HomeScoreOutput } from "@/services/homeScoreService";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import {
  Home, Wrench, Hammer, Zap, FileText, ShieldCheck,
  CheckCircle2, X, Clock, Sparkles, Trophy,
  BarChart3, Layers, ClipboardList, FolderOpen,
} from "lucide-react";
import HomeScoreCard from "@/components/passport/HomeScoreCard";
import PropertyIdentityCard from "@/components/passport/PropertyIdentityCard";
import SystemInventoryCards from "@/components/passport/SystemInventoryCards";
import RenovationHistory from "@/components/passport/RenovationHistory";
import MaintenanceTimeline from "@/components/passport/MaintenanceTimeline";
import DocumentVault from "@/components/passport/DocumentVault";

export default function PropertyPassportPage() {
  const { id } = useParams<{ id: string }>();
  const alexVoice = useAlexVoice();
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

  // Compute home score from property + passport data
  const { data: homeScore } = useQuery({
    queryKey: ["home-score-live", id, passport?.totalCompletion],
    queryFn: async () => {
      if (!property) return null;

      // Get counts from related tables
      const [docsRes, eventsRes] = await Promise.all([
        supabase.from("property_documents").select("id, document_type", { count: "exact" }).eq("property_id", id!),
        supabase.from("property_events").select("id, event_type", { count: "exact" }).eq("property_id", id!),
      ]);

      const docs = docsRes.data || [];
      const events = eventsRes.data || [];
      const structureData = passport?.sections.find((s) => s.key === "structure_systems")?.data ?? {};
      const energyData = passport?.sections.find((s) => s.key === "energy_equipment")?.data ?? {};

      const input: HomeScoreInput = {
        yearBuilt: property.year_built,
        propertyType: property.property_type,
        squareFootage: property.square_footage,
        condition: property.condition,
        hasInspectionReports: docs.some((d) => d.document_type === "inspection"),
        uploadedDocumentCount: docs.length,
        quoteCount: docs.filter((d) => d.document_type === "quote").length,
        renovationCount: events.filter((e) => e.event_type === "renovation" || e.event_type === "upgrade").length,
        recentRepairCount: events.filter((e) => e.event_type === "repair").length,
        heatingType: (structureData.heating_type as string) ?? null,
        roofYear: (structureData.roof_year as number) ?? null,
        windowsYear: (energyData.windows_year as number) ?? null,
        insulationType: (energyData.insulation as string) ?? null,
        foundationType: (structureData.foundation_type as string) ?? null,
        plumbingYear: (structureData.plumbing_year as number) ?? null,
        passportCompletionPct: passport?.totalCompletion,
      };

      return calculateHomeScore(input);
    },
    enabled: !!id && !!property && !!passport,
  });

  const completeMutation = useMutation({
    mutationFn: completeTask,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["next-tasks", id] });
      qc.invalidateQueries({ queryKey: ["completion-stats", id] });
      qc.invalidateQueries({ queryKey: ["passport", id] });
      qc.invalidateQueries({ queryKey: ["home-score-live", id] });
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

  // Merge section data for components
  const structureData = passport?.sections.find((s) => s.key === "structure_systems")?.data ?? {};
  const energyData = passport?.sections.find((s) => s.key === "energy_equipment")?.data ?? {};
  const basicData = passport?.sections.find((s) => s.key === "basic_info")?.data ?? {};
  const systemSectionData = { ...structureData, ...energyData };

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
        {/* Claim Banner */}
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

        {/* Score + Completion Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Home Score */}
          <HomeScoreCard score={homeScore ?? null} />

          {/* Completion */}
          <Card className="border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Trophy className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display text-sm font-semibold text-foreground">
                    Complétion
                  </h2>
                  {levelBadge && passport && (
                    <span className={`text-xs ${levelBadge.color}`}>
                      {levelBadge.emoji} {passport.level}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="font-display text-3xl font-bold text-primary">
                  {stats?.pct ?? 0}%
                </span>
                <span className="text-xs text-muted-foreground">
                  {stats?.earnedPoints ?? 0}/{stats?.totalPoints ?? 0} pts
                </span>
              </div>
              <Progress value={stats?.pct ?? 0} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {stats?.completed ?? 0} complétées · {(stats?.total ?? 0) - (stats?.completed ?? 0) - (stats?.dismissed ?? 0)} restantes
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Next Actions */}
        {nextTasks && nextTasks.length > 0 && (
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
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

        {/* Passport Modules — Tabbed */}
        <Tabs defaultValue="identity" className="w-full">
          <TabsList className="w-full grid grid-cols-3 sm:grid-cols-6 h-auto p-1">
            <TabsTrigger value="identity" className="text-xs gap-1 py-2">
              <Home className="w-3 h-3" />
              <span className="hidden sm:inline">Identité</span>
            </TabsTrigger>
            <TabsTrigger value="systems" className="text-xs gap-1 py-2">
              <Wrench className="w-3 h-3" />
              <span className="hidden sm:inline">Systèmes</span>
            </TabsTrigger>
            <TabsTrigger value="renovations" className="text-xs gap-1 py-2">
              <Hammer className="w-3 h-3" />
              <span className="hidden sm:inline">Rénovations</span>
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="text-xs gap-1 py-2">
              <ClipboardList className="w-3 h-3" />
              <span className="hidden sm:inline">Entretien</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-xs gap-1 py-2">
              <FolderOpen className="w-3 h-3" />
              <span className="hidden sm:inline">Documents</span>
            </TabsTrigger>
            <TabsTrigger value="score" className="text-xs gap-1 py-2">
              <BarChart3 className="w-3 h-3" />
              <span className="hidden sm:inline">Score</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <TabsContent value="identity">
              <PropertyIdentityCard property={property} sectionData={basicData} />
            </TabsContent>
            <TabsContent value="systems">
              <SystemInventoryCards sectionData={systemSectionData} />
            </TabsContent>
            <TabsContent value="renovations">
              <RenovationHistory propertyId={id!} />
            </TabsContent>
            <TabsContent value="maintenance">
              <MaintenanceTimeline propertyId={id!} />
            </TabsContent>
            <TabsContent value="documents">
              <DocumentVault propertyId={id!} />
            </TabsContent>
            <TabsContent value="score">
              <div className="space-y-4">
                <HomeScoreCard score={homeScore ?? null} />
                <Card className="border-border/30">
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold text-foreground mb-2">Interprétation</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-success" />
                        <span className="text-muted-foreground">80–100 : Condition solide</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-accent" />
                        <span className="text-muted-foreground">60–79 : Bonne condition</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-warning" />
                        <span className="text-muted-foreground">40–59 : Attention requise</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-destructive" />
                        <span className="text-muted-foreground">0–39 : Risque élevé</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Badge variant={status.color}>{status.label}</Badge>
          <Badge variant={claimStatus.color}>{claimStatus.label}</Badge>
        </div>

        {/* Integration CTAs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Button asChild variant="outline" size="sm" className="text-xs gap-1">
            <Link to="/matching">
              <Wrench className="w-3 h-3" /> Trouver un entrepreneur
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => alexVoice.openAlex("general")}>
            <Sparkles className="w-3 h-3" /> Parler à Alex
          </Button>
          <Button asChild variant="outline" size="sm" className="text-xs gap-1">
            <Link to="/describe-project">
              <Hammer className="w-3 h-3" /> Planifier une rénovation
            </Link>
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
