/**
 * UNPRO — Contractor Growth view
 * /pro/growth
 */
import { useEffect, useState } from "react";
import ContractorLayout from "@/layouts/ContractorLayout";
import { PageHeader, StatCard, LoadingState, EmptyState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Target, Search, FileText, Users, CalendarCheck, DollarSign } from "lucide-react";

const ContractorGrowth = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [contractorId, setContractorId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Array<{ id: string; trade: string | null; city: string | null; status: string; targets_found: number; sms_sent: number; emails_sent: number; replies: number; appointments: number; activations: number }>>([]);
  const [competitors, setCompetitors] = useState<Array<{ id: string; competitor_name: string; google_rating: number | null; review_count: number | null; aipp_score: number | null; status: string }>>([]);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: c } = await supabase.from("contractors").select("id").eq("user_id", user.id).maybeSingle();
      if (!c) { setLoading(false); return; }
      setContractorId(c.id);
      const [{ data: camps }, { data: comps }] = await Promise.all([
        supabase.from("contractor_growth_campaigns").select("*").eq("contractor_id", c.id).order("created_at", { ascending: false }),
        supabase.from("contractor_competitors").select("*").eq("contractor_id", c.id).order("created_at", { ascending: false }).limit(50),
      ]);
      setCampaigns((camps ?? []) as typeof campaigns);
      setCompetitors((comps ?? []) as typeof competitors);
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <ContractorLayout><LoadingState /></ContractorLayout>;

  if (!contractorId) {
    return (
      <ContractorLayout>
        <PageHeader title="Croissance" description="Suivez votre moteur de croissance." />
        <EmptyState message="Profil entrepreneur introuvable." />
      </ContractorLayout>
    );
  }

  const competitorsCount = competitors.length;
  const avgAipp = competitors.length
    ? Math.round((competitors.reduce((a, c) => a + (c.aipp_score ?? 0), 0) / competitors.length) * 10) / 10
    : 0;
  const pagesGenerated = campaigns.length; // Phase 1 proxy
  const leadsQualified = campaigns.reduce((a, c) => a + (c.replies ?? 0), 0);
  const appointmentsBooked = campaigns.reduce((a, c) => a + (c.appointments ?? 0), 0);
  const revenueEst = appointmentsBooked * 250; // simple proxy

  return (
    <ContractorLayout>
      <PageHeader
        title="Croissance"
        description="UNPRO travaille pour vous: découverte de concurrents, visibilité IA, rendez-vous générés."
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard title="Concurrents découverts" value={competitorsCount} icon={<Search className="h-4 w-4" />} />
        <StatCard title="Score IA moyen (concurrents)" value={avgAipp || "—"} icon={<Target className="h-4 w-4" />} />
        <StatCard title="Pages générées" value={pagesGenerated} icon={<FileText className="h-4 w-4" />} />
        <StatCard title="Leads qualifiés" value={leadsQualified} icon={<Users className="h-4 w-4" />} />
        <StatCard title="Rendez-vous réservés" value={appointmentsBooked} icon={<CalendarCheck className="h-4 w-4" />} />
        <StatCard title="Revenu estimé" value={`${revenueEst.toLocaleString("fr-CA")} $`} icon={<DollarSign className="h-4 w-4" />} />
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle>Vos campagnes</CardTitle></CardHeader>
        <CardContent>
          {campaigns.length === 0 ? <EmptyState message="Aucune campagne pour l'instant. Elles démarrent automatiquement à l'activation." />
            : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Métier</TableHead><TableHead>Ville</TableHead><TableHead>Statut</TableHead>
                  <TableHead className="text-right">Cibles</TableHead><TableHead className="text-right">Réponses</TableHead>
                  <TableHead className="text-right">Rendez-vous</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {campaigns.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.trade ?? "—"}</TableCell>
                      <TableCell>{c.city ?? "—"}</TableCell>
                      <TableCell>{c.status}</TableCell>
                      <TableCell className="text-right">{c.targets_found}</TableCell>
                      <TableCell className="text-right">{c.replies}</TableCell>
                      <TableCell className="text-right">{c.appointments}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Concurrents découverts</CardTitle></CardHeader>
        <CardContent>
          {competitors.length === 0 ? <EmptyState message="Aucun concurrent détecté pour l'instant." />
            : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Nom</TableHead><TableHead>Note Google</TableHead><TableHead>Avis</TableHead>
                  <TableHead>Score IA</TableHead><TableHead>Statut</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {competitors.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.competitor_name}</TableCell>
                      <TableCell>{c.google_rating ?? "—"}</TableCell>
                      <TableCell>{c.review_count ?? 0}</TableCell>
                      <TableCell>{c.aipp_score ?? "—"}</TableCell>
                      <TableCell>{c.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
        </CardContent>
      </Card>
    </ContractorLayout>
  );
};

export default ContractorGrowth;
