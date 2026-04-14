import { useState } from "react";
import { Helmet } from "react-helmet-async";
import PageHero from "@/components/shared/PageHero";
import FilterBarCityDomainStatus from "@/components/extraction/FilterBarCityDomainStatus";
import CardCompanyIdentity from "@/components/extraction/CardCompanyIdentity";
import DrawerCompanyMergeReview from "@/components/extraction/DrawerCompanyMergeReview";
import WidgetExtractionProgress from "@/components/extraction/WidgetExtractionProgress";
import WidgetSourceHealth from "@/components/extraction/WidgetSourceHealth";
import {
  useExtractionQueue, useExtractionStats, useCompanySourceFields,
  useCompanyActions, useCitiesList, useServiceDomainsList, useSourceConnectors,
} from "@/hooks/useExtractionQueue";
import { Loader2 } from "lucide-react";

export default function PageAdminExtractionQueue() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [cityId, setCityId] = useState("all");
  const [domainId, setDomainId] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: companies, isLoading } = useExtractionQueue({ search, status, cityId, domainId });
  const { data: stats } = useExtractionStats();
  const { data: cities } = useCitiesList();
  const { data: domains } = useServiceDomainsList();
  const { data: sources } = useSourceConnectors();
  const { data: sourceFields } = useCompanySourceFields(selectedId);
  const { approve, reject } = useCompanyActions();

  const selectedCompany = companies?.find((c: any) => c.id === selectedId) ?? null;

  const handleOpenCompany = (id: string) => {
    setSelectedId(id);
    setDrawerOpen(true);
  };

  return (
    <>
      <Helmet>
        <title>Extraction Queue — UNPRO Admin</title>
      </Helmet>

      <div className="min-h-screen bg-background">
        <PageHero title="Queue d'extraction" subtitle="Fiches entreprises extraites — approuvez, fusionnez ou rejetez." compact />

        <div className="max-w-7xl mx-auto px-4 pb-12 space-y-6">
          {/* Stats widgets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <WidgetExtractionProgress
              total={stats?.total ?? 0}
              approved={stats?.approved ?? 0}
              pending={stats?.pending ?? 0}
              rejected={stats?.rejected ?? 0}
            />
            <WidgetSourceHealth sources={(sources ?? []) as any} />
          </div>

          {/* Filters */}
          <FilterBarCityDomainStatus
            search={search} onSearchChange={setSearch}
            status={status} onStatusChange={setStatus}
            cities={(cities ?? []) as any} cityId={cityId} onCityChange={setCityId}
            domains={(domains ?? []) as any} domainId={domainId} onDomainChange={setDomainId}
          />

          {/* Queue */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : companies?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">Aucune entreprise trouvée.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {companies?.map((c: any) => (
                <CardCompanyIdentity
                  key={c.id}
                  company={c}
                  onClick={() => handleOpenCompany(c.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Review drawer */}
        <DrawerCompanyMergeReview
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          company={selectedCompany}
          sourceFields={(sourceFields ?? []) as any}
          onApprove={async (id) => {
            await approve.mutateAsync(id);
            setDrawerOpen(false);
          }}
          onReject={async (id, notes) => {
            await reject.mutateAsync({ companyId: id, notes });
            setDrawerOpen(false);
          }}
          loading={approve.isPending || reject.isPending}
        />
      </div>
    </>
  );
}
