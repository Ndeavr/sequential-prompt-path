import { useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  useAdminTerritories,
  useAdminTerritoryAssignments,
  useAdminTerritoryWaitlist,
  useCreateTerritory,
  useUpdateTerritory,
  useToggleAssignment,
  useApproveFromWaitlist,
} from "@/hooks/useAdminTerritories";
import { computeOccupancy } from "@/services/territoryService";
import { toast } from "sonner";
import { Plus, MapPin, Users } from "lucide-react";

const AdminTerritories = () => {
  const { data: territories, isLoading } = useAdminTerritories();
  const createTerritory = useCreateTerritory();
  const updateTerritory = useUpdateTerritory();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: assignments } = useAdminTerritoryAssignments(selectedId ?? undefined);
  const { data: waitlist } = useAdminTerritoryWaitlist(selectedId ?? undefined);
  const toggleAssignment = useToggleAssignment();
  const approveWaitlist = useApproveFromWaitlist();

  // New territory form
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    city_slug: "",
    city_name: "",
    category_slug: "",
    category_name: "",
    max_contractors: 10,
    signature_slots: 1,
    elite_slots: 2,
    premium_slots: 3,
  });

  const handleCreate = async () => {
    try {
      await createTerritory.mutateAsync(form);
      toast.success("Territoire créé.");
      setShowCreate(false);
      setForm({ city_slug: "", city_name: "", category_slug: "", category_name: "", max_contractors: 10, signature_slots: 1, elite_slots: 2, premium_slots: 3 });
    } catch (e: any) {
      toast.error(e.message || "Erreur.");
    }
  };

  const selectedTerritory = territories?.find((t: any) => t.id === selectedId);

  if (isLoading) return <AdminLayout><LoadingState /></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader title="Territoires" description="Gestion des zones de service et slots" />
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Nouveau</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Créer un territoire</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Ville (slug)</Label><Input value={form.city_slug} onChange={(e) => setForm({ ...form, city_slug: e.target.value })} placeholder="laval" /></div>
                <div><Label>Ville (nom)</Label><Input value={form.city_name} onChange={(e) => setForm({ ...form, city_name: e.target.value })} placeholder="Laval" /></div>
                <div><Label>Catégorie (slug)</Label><Input value={form.category_slug} onChange={(e) => setForm({ ...form, category_slug: e.target.value })} placeholder="toiture" /></div>
                <div><Label>Catégorie (nom)</Label><Input value={form.category_name} onChange={(e) => setForm({ ...form, category_name: e.target.value })} placeholder="Toiture" /></div>
                <div><Label>Max entrepreneurs</Label><Input type="number" value={form.max_contractors} onChange={(e) => setForm({ ...form, max_contractors: Number(e.target.value) })} /></div>
                <div><Label>Slots Signature</Label><Input type="number" value={form.signature_slots} onChange={(e) => setForm({ ...form, signature_slots: Number(e.target.value) })} /></div>
                <div><Label>Slots Élite</Label><Input type="number" value={form.elite_slots} onChange={(e) => setForm({ ...form, elite_slots: Number(e.target.value) })} /></div>
                <div><Label>Slots Premium</Label><Input type="number" value={form.premium_slots} onChange={(e) => setForm({ ...form, premium_slots: Number(e.target.value) })} /></div>
              </div>
              <Button onClick={handleCreate} disabled={createTerritory.isPending || !form.city_slug || !form.category_slug}>
                {createTerritory.isPending ? "Création…" : "Créer"}
              </Button>
            </DialogContent>
          </Dialog>
        </div>

        {/* Territory list */}
        {!(territories ?? []).length ? (
          <EmptyState message="Aucun territoire créé." />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left: territory list */}
            <div className="lg:col-span-1 space-y-2">
              {(territories ?? []).map((t: any) => (
                <Card
                  key={t.id}
                  className={`cursor-pointer transition-colors ${selectedId === t.id ? "border-primary" : ""}`}
                  onClick={() => setSelectedId(t.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {t.category_name} – {t.city_name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Max: {t.max_contractors} · Sig: {t.signature_slots} · Éli: {t.elite_slots} · Pre: {t.premium_slots}
                        </p>
                      </div>
                      <Badge variant={t.is_active ? "default" : "secondary"} className="text-xs">
                        {t.is_active ? "Actif" : "Inactif"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Right: detail */}
            <div className="lg:col-span-2">
              {selectedTerritory ? (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {selectedTerritory.category_name} – {selectedTerritory.city_name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-4">
                        <Label>Actif</Label>
                        <Switch
                          checked={selectedTerritory.is_active}
                          onCheckedChange={(v) =>
                            updateTerritory.mutate({ id: selectedTerritory.id, is_active: v })
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Assignments */}
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Entrepreneurs assignés ({assignments?.length ?? 0})</CardTitle></CardHeader>
                    <CardContent>
                      {assignments?.length ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Entreprise</TableHead>
                              <TableHead>Slot</TableHead>
                              <TableHead>AIPP</TableHead>
                              <TableHead>Actif</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {assignments.map((a: any) => (
                              <TableRow key={a.id}>
                                <TableCell className="font-medium">{a.contractors?.business_name ?? "—"}</TableCell>
                                <TableCell><Badge variant="outline" className="text-xs">{a.slot_type}</Badge></TableCell>
                                <TableCell>{a.contractors?.aipp_score ?? "—"}</TableCell>
                                <TableCell>
                                  <Switch
                                    checked={a.active}
                                    onCheckedChange={(v) =>
                                      toggleAssignment.mutate({ id: a.id, active: v })
                                    }
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <p className="text-sm text-muted-foreground">Aucun entrepreneur assigné.</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Waitlist */}
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Liste d'attente ({waitlist?.length ?? 0})</CardTitle></CardHeader>
                    <CardContent>
                      {waitlist?.length ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Entreprise</TableHead>
                              <TableHead>AIPP</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {waitlist.map((w: any) => (
                              <TableRow key={w.id}>
                                <TableCell className="font-medium">{w.contractors?.business_name ?? "—"}</TableCell>
                                <TableCell>{w.contractors?.aipp_score ?? "—"}</TableCell>
                                <TableCell>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      approveWaitlist.mutate({
                                        waitlistEntry: w,
                                        slotType: "standard",
                                        planLevel: "standard",
                                      })
                                    }
                                    disabled={approveWaitlist.isPending}
                                  >
                                    Approuver
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <p className="text-sm text-muted-foreground">Aucune entrée en attente.</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    Sélectionnez un territoire pour voir les détails.
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminTerritories;
