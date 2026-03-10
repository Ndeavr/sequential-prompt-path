import { useState } from "react";
import ContractorLayout from "@/layouts/ContractorLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  useTerritories,
  useContractorTerritories,
  useContractorWaitlist,
  useRequestTerritory,
  useLeaveTerritory,
  useLeaveWaitlist,
  useAllTerritoryAssignments,
} from "@/hooks/useTerritories";
import { useHasActiveSubscription } from "@/hooks/useSubscription";
import SubscriptionPaywall from "@/components/contractor/SubscriptionPaywall";
import { computeOccupancy, getDemandLevel, getSlotTypeForPlan, hasAvailableSlot } from "@/services/territoryService";
import { toast } from "sonner";
import { MapPin, Clock, Check, X } from "lucide-react";

const slotLabels: Record<string, string> = {
  signature: "Signature",
  elite: "Élite",
  premium: "Premium",
  standard: "Standard",
};

const ProTerritories = () => {
  const { hasActive, isLoading: subLoading, planId } = useHasActiveSubscription();
  const { data: territories, isLoading: terrLoading } = useTerritories();
  const { data: myTerritories, isLoading: myLoading } = useContractorTerritories();
  const { data: myWaitlist } = useContractorWaitlist();
  const { data: allAssignments } = useAllTerritoryAssignments();
  const requestTerritory = useRequestTerritory();
  const leaveTerritory = useLeaveTerritory();
  const leaveWaitlist = useLeaveWaitlist();

  if (subLoading || terrLoading || myLoading) {
    return <ContractorLayout><LoadingState /></ContractorLayout>;
  }

  if (!hasActive) {
    return (
      <ContractorLayout>
        <SubscriptionPaywall
          title="Abonnement requis"
          message="Activez votre abonnement pour accéder aux territoires."
        />
      </ContractorLayout>
    );
  }

  const myTerritoryIds = new Set((myTerritories ?? []).map((t: any) => t.territory_id));
  const myWaitlistIds = new Set((myWaitlist ?? []).map((w: any) => w.territory_id));

  const getOccupancyForTerritory = (territoryId: string) => {
    const assignments = (allAssignments ?? []).filter((a: any) => a.territory_id === territoryId);
    return computeOccupancy(assignments);
  };

  const handleRequest = async (territoryId: string) => {
    try {
      const result = await requestTerritory.mutateAsync(territoryId);
      if (result.waitlisted) {
        toast.info("Territoire complet. Vous avez été ajouté à la liste d'attente.");
      } else {
        toast.success("Territoire assigné avec succès !");
      }
    } catch (e: any) {
      toast.error(e.message || "Erreur.");
    }
  };

  const handleLeave = async (assignmentId: string) => {
    try {
      await leaveTerritory.mutateAsync(assignmentId);
      toast.success("Territoire quitté.");
    } catch {
      toast.error("Erreur.");
    }
  };

  const handleLeaveWaitlist = async (waitlistId: string) => {
    try {
      await leaveWaitlist.mutateAsync(waitlistId);
      toast.success("Retiré de la liste d'attente.");
    } catch {
      toast.error("Erreur.");
    }
  };

  return (
    <ContractorLayout>
      <PageHeader
        title="Territoires"
        description="Gérez vos zones de service et votre visibilité"
      />

      {/* My active territories */}
      {(myTerritories ?? []).length > 0 && (
        <div className="mb-8">
          <h2 className="text-base font-semibold mb-3">Mes territoires actifs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(myTerritories ?? []).map((ta: any) => (
              <Card key={ta.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        {ta.territories?.category_name} – {ta.territories?.city_name}
                      </p>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {slotLabels[ta.slot_type] ?? ta.slot_type}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLeave(ta.id)}
                      disabled={leaveTerritory.isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Waitlisted */}
      {(myWaitlist ?? []).length > 0 && (
        <div className="mb-8">
          <h2 className="text-base font-semibold mb-3">Liste d'attente</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(myWaitlist ?? []).map((w: any) => (
              <Card key={w.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {w.territories?.category_name} – {w.territories?.city_name}
                    </p>
                    <Badge variant="secondary" className="mt-1 text-xs">En attente</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLeaveWaitlist(w.id)}
                    disabled={leaveWaitlist.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Available territories */}
      <h2 className="text-base font-semibold mb-3">Territoires disponibles</h2>
      {!(territories ?? []).length ? (
        <EmptyState message="Aucun territoire configuré pour le moment." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(territories ?? []).map((t: any) => {
            const occupancy = getOccupancyForTerritory(t.id);
            const ratio = t.max_contractors > 0 ? occupancy.total_used / t.max_contractors : 0;
            const demand = getDemandLevel(ratio);
            const slotType = getSlotTypeForPlan(planId ?? "recrue");
            const available = hasAvailableSlot(t, occupancy, slotType);
            const isAssigned = myTerritoryIds.has(t.id);
            const isWaitlisted = myWaitlistIds.has(t.id);

            return (
              <Card key={t.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t.category_name} – {t.city_name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Occupation: {occupancy.total_used} / {t.max_contractors}</span>
                    <Badge variant={demand === "Élevée" ? "destructive" : demand === "Moyenne" ? "secondary" : "outline"} className="text-xs">
                      {demand}
                    </Badge>
                  </div>
                  <Progress value={ratio * 100} className="h-1.5" />
                  <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                    <span>Sig: {occupancy.signature_used}/{t.signature_slots}</span>
                    <span>·</span>
                    <span>Éli: {occupancy.elite_used}/{t.elite_slots}</span>
                    <span>·</span>
                    <span>Pre: {occupancy.premium_used}/{t.premium_slots}</span>
                  </div>

                  {isAssigned ? (
                    <Button variant="outline" size="sm" disabled className="w-full gap-1">
                      <Check className="h-3 w-3" /> Assigné
                    </Button>
                  ) : isWaitlisted ? (
                    <Button variant="outline" size="sm" disabled className="w-full gap-1">
                      <Clock className="h-3 w-3" /> En attente
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => handleRequest(t.id)}
                      disabled={requestTerritory.isPending}
                    >
                      {available ? "Demander ce territoire" : "Rejoindre la liste d'attente"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </ContractorLayout>
  );
};

export default ProTerritories;
