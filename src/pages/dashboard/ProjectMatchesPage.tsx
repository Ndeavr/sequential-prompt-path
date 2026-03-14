/**
 * UNPRO — Project Matches Page
 * Shows suggested contractors after project creation.
 */

import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/layouts/DashboardLayout";
import { PageHeader } from "@/components/shared";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, MapPin, Star, ShieldCheck, ArrowRight, Clock, Award, Users } from "lucide-react";
import { motion } from "framer-motion";
import TrustSummaryCard from "@/components/contractor/TrustSummaryCard";

const ProjectMatchesPage = () => {
  const { projectId } = useParams();
  const { user } = useAuth();

  // Fetch project details
  const { data: project } = useQuery({
    queryKey: ["project-detail", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, properties(address, city)")
        .eq("id", projectId!)
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId && !!user?.id,
  });

  // Fetch suggested contractors (by category/city match)
  const { data: suggestions, isLoading } = useQuery({
    queryKey: ["project-suggestions", projectId],
    queryFn: async () => {
      // Get project's property city
      const property = project?.properties as any;
      const city = property?.city;

      let query = supabase
        .from("contractors")
        .select(`
          id, business_name, specialty, city, province, logo_url,
          rating, review_count, verification_status, years_experience,
          aipp_score, description
        `)
        .eq("verification_status", "verified")
        .order("aipp_score", { ascending: false })
        .limit(10);

      if (city) {
        query = query.eq("city", city);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!project,
  });

  const [expandedTrust, setExpandedTrust] = useState<string | null>(null);

  return (
    <DashboardLayout>
      <PageHeader
        title="Entrepreneurs suggérés"
        description={project ? `Pour votre projet « ${project.title} »` : "Chargement…"}
      />

      {/* Project context card */}
      {project && (
        <Card className="glass-card border-0 shadow-sm mb-6">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{project.title}</p>
              <p className="text-xs text-muted-foreground">
                {(project.properties as any)?.address} · {project.urgency === "critical" ? "Urgent" : project.timeline ?? "Flexible"}
              </p>
            </div>
            <Badge variant="secondary" className="text-[10px]">
              <Users className="h-3 w-3 mr-1" />
              {suggestions?.length ?? 0} matchs
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Suggestions list */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : (suggestions?.length ?? 0) === 0 ? (
        <Card className="glass-card border-0 p-8 text-center">
          <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Aucun entrepreneur trouvé pour le moment.</p>
          <p className="text-xs text-muted-foreground mt-1">Nous élargirons la recherche bientôt.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {suggestions!.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="glass-card border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-3">
                  {/* Top row */}
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center overflow-hidden">
                      {c.logo_url ? (
                        <img src={c.logo_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-lg font-bold text-primary">{c.business_name.charAt(0)}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-foreground text-sm truncate">{c.business_name}</h3>
                        {c.verification_status === "verified" && (
                          <Badge variant="secondary" className="gap-1 text-[9px] bg-success/10 text-success border-0 rounded-full px-2 py-0.5">
                            <ShieldCheck className="h-2.5 w-2.5" /> Vérifié
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                        {c.rating != null && c.rating > 0 && (
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-current text-accent" />
                            {c.rating.toFixed(1)}
                          </span>
                        )}
                        {c.review_count != null && c.review_count > 0 && (
                          <span>{c.review_count} avis</span>
                        )}
                        {c.years_experience != null && c.years_experience > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />{c.years_experience}+ ans
                          </span>
                        )}
                        {c.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />{c.city}
                          </span>
                        )}
                      </div>
                    </div>

                    {c.aipp_score != null && c.aipp_score > 0 && (
                      <div className="shrink-0 text-center">
                        <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">AIPP</div>
                        <div className="text-xl font-bold text-primary leading-tight">{c.aipp_score}</div>
                      </div>
                    )}
                  </div>

                  {/* Trust toggle */}
                  <button
                    onClick={() => setExpandedTrust(expandedTrust === c.id ? null : c.id)}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <ShieldCheck className="h-3 w-3" />
                    {expandedTrust === c.id ? "Masquer" : "Voir"} confiance & conformité
                  </button>

                  {expandedTrust === c.id && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                      <TrustSummaryCard contractorId={c.id} />
                    </motion.div>
                  )}

                  {/* CTAs */}
                  <div className="flex gap-2">
                    <Button asChild size="sm" className="flex-1 rounded-xl gap-1 h-9">
                      <Link to={`/dashboard/book/${c.id}`}>
                        Rendez-vous <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="flex-1 rounded-xl h-9 glass-surface border-border/60">
                      <Link to={`/contractors/${c.id}`}>
                        Voir profil
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

// Need useState import
import { useState } from "react";

export default ProjectMatchesPage;
