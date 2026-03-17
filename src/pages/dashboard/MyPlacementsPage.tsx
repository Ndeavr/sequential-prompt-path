/**
 * UNPRO — My QR Placements Dashboard
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getUserPlacements, createPlacement, PLACEMENT_TYPES, type PlacementType } from "@/services/placementService";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, QrCode, Truck, Building2, CreditCard, Signpost, Megaphone, ExternalLink, Download, BarChart3 } from "lucide-react";
import { toast } from "sonner";

const ICON_MAP: Record<string, React.ElementType> = {
  Truck, Building2, CreditCard, Signpost, Megaphone,
};

export default function MyPlacementsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data: placements = [], isLoading } = useQuery({
    queryKey: ["my-placements", user?.id],
    queryFn: () => getUserPlacements(user!.id),
    enabled: !!user?.id,
  });

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <QrCode className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Mes emplacements QR</h1>
              <p className="text-sm text-muted-foreground">Gérez vos codes QR physiques</p>
            </div>
          </div>
          <CreatePlacementDialog
            open={showCreate}
            onOpenChange={setShowCreate}
            userId={user?.id || ""}
            onCreated={() => qc.invalidateQueries({ queryKey: ["my-placements"] })}
          />
        </div>

        {isLoading ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Chargement...</CardContent></Card>
        ) : placements.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center space-y-3">
              <QrCode className="h-12 w-12 text-muted-foreground/30 mx-auto" />
              <p className="text-muted-foreground">Aucun emplacement QR configuré</p>
              <Button size="sm" onClick={() => setShowCreate(true)}>Créer un emplacement</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {(placements as any[]).map((p: any) => {
              const typeInfo = PLACEMENT_TYPES.find(t => t.value === p.placement_type);
              const Icon = ICON_MAP[typeInfo?.icon || "QrCode"] || QrCode;
              return (
                <Card key={p.id} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm truncate">{p.name}</p>
                          <Badge variant={p.is_active ? "default" : "secondary"} className="text-[10px]">
                            {p.is_active ? "Actif" : "Inactif"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{typeInfo?.label || p.placement_type}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1">
                        <QrCode className="h-3.5 w-3.5" />QR
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1">
                        <Download className="h-3.5 w-3.5" />Télécharger
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1">
                        <ExternalLink className="h-3.5 w-3.5" />Tester
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1">
                        <BarChart3 className="h-3.5 w-3.5" />Stats
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function CreatePlacementDialog({ open, onOpenChange, userId, onCreated }: {
  open: boolean; onOpenChange: (o: boolean) => void; userId: string; onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<PlacementType>("business_card");

  const mutation = useMutation({
    mutationFn: () => createPlacement({ name, placementType: type, ownerUserId: userId }),
    onSuccess: () => {
      onCreated();
      onOpenChange(false);
      setName("");
      toast.success("Emplacement créé");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />Nouveau</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Nouvel emplacement QR</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nom</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Mon camion" /></div>
          <div><Label>Type</Label>
            <Select value={type} onValueChange={v => setType(v as PlacementType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PLACEMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => mutation.mutate()} disabled={!name || mutation.isPending} className="w-full">
            {mutation.isPending ? "Création..." : "Créer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
