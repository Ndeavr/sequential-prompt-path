import { Link } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import { PageHeader, EmptyState, LoadingState, StatCard } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSyndicates } from "@/hooks/useSyndicate";
import { motion } from "framer-motion";
import { Building2, Plus, Users, Wallet, Wrench, Vote, ArrowRight } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4, ease: "easeOut" as const } }),
};

const SyndicateDashboard = () => {
  const { data: syndicates, isLoading } = useSyndicates();

  if (isLoading) return <DashboardLayout><LoadingState /></DashboardLayout>;

  if (!syndicates?.length) {
    return (
      <DashboardLayout>
        <PageHeader title="Syndicats" description="Gestion de copropriété" />
        <EmptyState
          icon={<Building2 className="h-10 w-10 text-primary/40" />}
          title="Aucun syndicat"
          description="Créez ou rejoignez un syndicat de copropriété pour commencer."
          action={
            <Button asChild>
              <Link to="/dashboard/syndicates/new"><Plus className="h-4 w-4 mr-1" /> Créer un syndicat</Link>
            </Button>
          }
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Syndicats"
        description="Gestion de vos copropriétés"
        action={
          <Button asChild size="sm">
            <Link to="/dashboard/syndicates/new"><Plus className="h-4 w-4 mr-1" /> Nouveau syndicat</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {syndicates.map((s: any, i: number) => (
          <motion.div key={s.id} variants={fadeUp} initial="hidden" animate="show" custom={i}>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base font-semibold">{s.name}</CardTitle>
                  <Badge variant="secondary" className="text-xs">{s.unit_count || 0} unités</Badge>
                </div>
                {s.address && <p className="text-sm text-muted-foreground">{s.address}, {s.city}</p>}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-4 gap-2">
                  <Link to={`/dashboard/syndicates/${s.id}`} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Membres</span>
                  </Link>
                  <Link to={`/dashboard/syndicates/${s.id}/reserve`} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                    <Wallet className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Fonds</span>
                  </Link>
                  <Link to={`/dashboard/syndicates/${s.id}/maintenance`} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                    <Wrench className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Entretien</span>
                  </Link>
                  <Link to={`/dashboard/syndicates/${s.id}/votes`} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                    <Vote className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Votes</span>
                  </Link>
                </div>
                <Button asChild variant="ghost" size="sm" className="w-full justify-between">
                  <Link to={`/dashboard/syndicates/${s.id}`}>
                    Voir le détail <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default SyndicateDashboard;
