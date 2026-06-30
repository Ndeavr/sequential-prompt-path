/**
 * UNPRO — ProjectWaitingPage
 * Shown when a homeowner project has no available contractor match path.
 * Renders <WaitingPositionCard /> based on the demand_signals row.
 */
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/layouts/DashboardLayout";
import { PageHeader } from "@/components/shared";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { WaitingPositionCard } from "@/components/demand/WaitingPositionCard";
import { Skeleton } from "@/components/ui/skeleton";

const ProjectWaitingPage = () => {
  const { projectId } = useParams();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["project-waiting", projectId],
    enabled: !!projectId && !!user?.id,
    queryFn: async () => {
      const { data: project, error: pErr } = await supabase
        .from("projects")
        .select("id, title, user_id, properties(city)")
        .eq("id", projectId!)
        .eq("user_id", user!.id)
        .single();
      if (pErr) throw pErr;

      const { data: signal } = await supabase
        .from("demand_signals" as any)
        .select("id, city, category, position_in_queue, status")
        .eq("project_id", projectId!)
        .maybeSingle();

      return { project, signal };
    },
  });

  return (
    <DashboardLayout>
      <PageHeader
        title="Vous êtes sur la liste prioritaire"
        description={data?.project ? `Projet « ${data.project.title} »` : "Chargement…"}
      />

      <div className="alex-immersive max-w-2xl">
        {isLoading || !data ? (
          <Skeleton className="h-72 rounded-3xl" />
        ) : (
          <WaitingPositionCard
            projectId={data.project.id}
            homeownerId={data.project.user_id}
            city={(data.signal as any)?.city ?? (data.project.properties as any)?.city ?? "votre région"}
            category={(data.signal as any)?.category ?? "entrepreneur"}
            position={(data.signal as any)?.position_in_queue ?? null}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default ProjectWaitingPage;
