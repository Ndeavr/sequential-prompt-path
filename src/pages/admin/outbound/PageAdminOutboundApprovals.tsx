import { useState } from "react";
import { Helmet } from "react-helmet-async";
import AdminLayout from "@/layouts/AdminLayout";
import PageHero from "@/components/shared/PageHero";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search } from "lucide-react";
import CardProspectIdentity from "@/components/outbound/CardProspectIdentity";
import DrawerProspectReview from "@/components/outbound/DrawerProspectReview";
import WidgetDailySendVolume from "@/components/outbound/WidgetDailySendVolume";
import WidgetReplyRate from "@/components/outbound/WidgetReplyRate";
import PanelSendingHealth from "@/components/outbound/PanelSendingHealth";
import {
  useProspectApprovalQueue,
  useProspectStats,
  useProspectActions,
} from "@/hooks/useOutboundProspects";

export default function PageAdminOutboundApprovals() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [city, setCity] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: prospects, isLoading } = useProspectApprovalQueue({ search, status, city });
  const { data: stats } = useProspectStats();
  const { approve, reject } = useProspectActions();

  const selected = prospects?.find((p: any) => p.id === selectedId) ?? null;

  const handleOpen = (id: string) => {
    setSelectedId(id);
    setDrawerOpen(true);
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>Approbation Prospects — UNPRO Admin</title>
      </Helmet>

      <div className="min-h-screen bg-background">
        <PageHero
          title="Approbation prospects"
          subtitle="Approuvez les prospects qualifiés avant leur entrée en séquence d'envoi."
          compact
        />

        <div className="max-w-7xl mx-auto px-4 pb-12 space-y-6">
          {/* Stats widgets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-lg border p-4 space-y-1">
              <div className="text-xs text-muted-foreground">Total prospects</div>
              <div className="text-2xl font-bold">{stats?.total ?? 0}</div>
            </div>
            <div className="rounded-lg border p-4 space-y-1">
              <div className="text-xs text-muted-foreground">Nouveaux</div>
              <div className="text-2xl font-bold text-primary">{stats?.new ?? 0}</div>
            </div>
            <WidgetDailySendVolume />
            <WidgetReplyRate />
          </div>

          {/* Sending health */}
          <PanelSendingHealth />

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Recherche par nom, email, téléphone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="new">Nouveau</SelectItem>
                <SelectItem value="imported">Importé</SelectItem>
                <SelectItem value="scored">Scoré</SelectItem>
                <SelectItem value="approved">Approuvé</SelectItem>
                <SelectItem value="rejected">Rejeté</SelectItem>
              </SelectContent>
            </Select>
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Ville" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="Montréal">Montréal</SelectItem>
                <SelectItem value="Québec">Québec</SelectItem>
                <SelectItem value="Laval">Laval</SelectItem>
                <SelectItem value="Gatineau">Gatineau</SelectItem>
                <SelectItem value="Sherbrooke">Sherbrooke</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Queue */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : prospects?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Aucun prospect trouvé.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {prospects?.map((p: any) => (
                <CardProspectIdentity key={p.id} prospect={p} onClick={() => handleOpen(p.id)} />
              ))}
            </div>
          )}
        </div>

        <DrawerProspectReview
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          prospect={selected}
          onApprove={async (id) => {
            await approve.mutateAsync({ prospectId: id });
            setDrawerOpen(false);
          }}
          onReject={async (id, notes) => {
            await reject.mutateAsync({ prospectId: id, notes });
            setDrawerOpen(false);
          }}
          loading={approve.isPending || reject.isPending}
        />
      </div>
    </AdminLayout>
  );
}
