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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useAdminTerritories,
  useAdminTerritoryAssignments,
  useAdminTerritoryWaitlist,
  useCreateTerritory,
  useUpdateTerritory,
  useToggleAssignment,
  useApproveFromWaitlist,
  useCategories,
  useServiceAreas,
  useGenerationLogs,
  useGenerateTerritories,
} from "@/hooks/useAdminTerritories";
import { toast } from "sonner";
import { Plus, MapPin, Users, Zap, History, Search, AlertTriangle } from "lucide-react";

const AdminTerritories = () => {
  const { data: territories, isLoading } = useAdminTerritories();
  const { data: categories } = useCategories();
  const { data: serviceAreas } = useServiceAreas();
  const { data: generationLogs } = useGenerationLogs();
  const createTerritory = useCreateTerritory();
  const updateTerritory = useUpdateTerritory();
  const generateTerritories = useGenerateTerritories();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: assignments } = useAdminTerritoryAssignments(selectedId ?? undefined);
  const { data: waitlist } = useAdminTerritoryWaitlist(selectedId ?? undefined);
  const toggleAssignment = useToggleAssignment();
  const approveWaitlist = useApproveFromWaitlist();

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCity, setFilterCity] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // New territory form
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    city_slug: "", city_name: "", category_slug: "", category_name: "",
    max_entrepreneurs: 10, slots_signature: 1, slots_elite: 2, slots_premium: 3, slots_pro: 2, slots_recrue: 2,
  });

  const handleCreate = async () => {
    try {
      await createTerritory.mutateAsync(form);
      toast.success("Territoire créé.");
      setShowCreate(false);
      setForm({ city_slug: "", city_name: "", category_slug: "", category_name: "", max_entrepreneurs: 10, slots_signature: 1, slots_elite: 2, slots_premium: 3, slots_pro: 2, slots_recrue: 2 });
    } catch (e: any) {
      toast.error(e.message || "Erreur.");
    }
  };

  const handleGenerate = async (mode: string, source: string, citySlugs?: string[] | null) => {
    try {
      const result = await generateTerritories.mutateAsync({
        p_city_slugs: citySlugs ?? null,
        p_category_slugs: null,
        p_mode: mode,
        p_overwrite_existing_capacities: mode === "upsert_all",
        p_generation_source: source,
      });
      const r = result as any;
      toast.success(`${mode === "dry_run" ? "Simulation" : "Génération"}: ${r.created_count ?? 0} créés, ${r.updated_count ?? 0} mis à jour, ${r.skipped_count ?? 0} ignorés`);
    } catch (e: any) {
      toast.error(e.message || "Erreur de génération.");
    }
  };

  const PRIORITY_CITIES = ["montreal", "laval", "longueuil", "quebec", "gatineau", "sherbrooke", "terrebonne", "levis", "brossard", "repentigny"];

  const filteredTerritories = (territories ?? []).filter((t: any) => {
    if (filterCity !== "all" && t.city_slug !== filterCity) return false;
    if (filterCategory !== "all" && t.category_slug !== filterCategory) return false;
    if (filterStatus === "active" && !t.is_active) return false;
    if (filterStatus === "inactive" && t.is_active) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!t.city_name.toLowerCase().includes(q) && !t.category_name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const selectedTerritory = territories?.find((t: any) => t.id === selectedId);
  const uniqueCities = [...new Set((territories ?? []).map((t: any) => t.city_slug))].sort();
  const uniqueCategories = [...new Set((territories ?? []).map((t: any) => t.category_slug))].sort();

  if (isLoading) return <AdminLayout><LoadingState /></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-4">
        <PageHeader title="Territoires" description={`${territories?.length ?? 0} territoires · ${categories?.length ?? 0} catégories · ${serviceAreas?.length ?? 0} villes`} />

        <Tabs defaultValue="list" className="w-full">
          <TabsList>
            <TabsTrigger value="list">Liste</TabsTrigger>
            <TabsTrigger value="generate">Génération massive</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>

          {/* ── LIST TAB ── */}
          <TabsContent value="list" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8" />
              </div>
              <Select value={filterCity} onValueChange={setFilterCity}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Ville" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les villes</SelectItem>
                  {uniqueCities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Catégorie" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  {uniqueCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[120px]"><SelectValue placeholder="Statut" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="active">Actifs</SelectItem>
                  <SelectItem value="inactive">Inactifs</SelectItem>
                </SelectContent>
              </Select>
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
                    <div><Label>Max entrepreneurs</Label><Input type="number" value={form.max_entrepreneurs} onChange={(e) => setForm({ ...form, max_entrepreneurs: Number(e.target.value) })} /></div>
                    <div><Label>Signature</Label><Input type="number" value={form.slots_signature} onChange={(e) => setForm({ ...form, slots_signature: Number(e.target.value) })} /></div>
                    <div><Label>Élite</Label><Input type="number" value={form.slots_elite} onChange={(e) => setForm({ ...form, slots_elite: Number(e.target.value) })} /></div>
                    <div><Label>Premium</Label><Input type="number" value={form.slots_premium} onChange={(e) => setForm({ ...form, slots_premium: Number(e.target.value) })} /></div>
                    <div><Label>Pro</Label><Input type="number" value={form.slots_pro} onChange={(e) => setForm({ ...form, slots_pro: Number(e.target.value) })} /></div>
                    <div><Label>Recrue</Label><Input type="number" value={form.slots_recrue} onChange={(e) => setForm({ ...form, slots_recrue: Number(e.target.value) })} /></div>
                  </div>
                  <Button onClick={handleCreate} disabled={createTerritory.isPending || !form.city_slug || !form.category_slug}>
                    {createTerritory.isPending ? "Création…" : "Créer"}
                  </Button>
                </DialogContent>
              </Dialog>
            </div>

            {/* Results count */}
            <p className="text-xs text-muted-foreground">{filteredTerritories.length} résultats</p>

            {!filteredTerritories.length ? (
              <EmptyState message="Aucun territoire trouvé." />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left: territory list */}
                <div className="lg:col-span-1 space-y-2 max-h-[70vh] overflow-y-auto">
                  {filteredTerritories.map((t: any) => {
                    const occupiedTotal = (t.occupied_signature ?? 0) + (t.occupied_elite ?? 0) + (t.occupied_premium ?? 0) + (t.occupied_pro ?? 0) + (t.occupied_recrue ?? 0);
                    const isOverbooked = t.occupied_signature > t.slots_signature || t.occupied_elite > t.slots_elite || t.occupied_premium > t.slots_premium;
                    return (
                      <Card
                        key={t.id}
                        className={`cursor-pointer transition-colors ${selectedId === t.id ? "border-primary" : ""} ${isOverbooked ? "border-destructive" : ""}`}
                        onClick={() => setSelectedId(t.id)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="min-w-0">
                              <p className="font-medium text-sm flex items-center gap-1.5 truncate">
                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                {t.category_name} – {t.city_name}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {occupiedTotal}/{t.max_entrepreneurs} · {t.market_tier} · S{t.slots_signature} E{t.slots_elite} P{t.slots_premium} Pro{t.slots_pro} R{t.slots_recrue}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {isOverbooked && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                              <Badge variant={t.is_active ? "default" : "secondary"} className="text-xs">
                                {t.status ?? (t.is_active ? "active" : "inactive")}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
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
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                            <div><span className="text-muted-foreground">Marché:</span> <Badge variant="outline">{selectedTerritory.market_tier}</Badge></div>
                            <div><span className="text-muted-foreground">Région:</span> {selectedTerritory.region_name ?? "—"}</div>
                            <div><span className="text-muted-foreground">Max:</span> {selectedTerritory.max_entrepreneurs}</div>
                            <div><span className="text-muted-foreground">Sig:</span> {selectedTerritory.occupied_signature}/{selectedTerritory.slots_signature}</div>
                            <div><span className="text-muted-foreground">Éli:</span> {selectedTerritory.occupied_elite}/{selectedTerritory.slots_elite}</div>
                            <div><span className="text-muted-foreground">Pre:</span> {selectedTerritory.occupied_premium}/{selectedTerritory.slots_premium}</div>
                            <div><span className="text-muted-foreground">Pro:</span> {selectedTerritory.occupied_pro}/{selectedTerritory.slots_pro}</div>
                            <div><span className="text-muted-foreground">Rec:</span> {selectedTerritory.occupied_recrue}/{selectedTerritory.slots_recrue}</div>
                            <div><span className="text-muted-foreground">Source:</span> {selectedTerritory.generation_source ?? "manuel"}</div>
                          </div>
                          <div className="flex items-center gap-4 pt-2 border-t">
                            <Label>Actif</Label>
                            <Switch checked={selectedTerritory.is_active} onCheckedChange={(v) => updateTerritory.mutate({ id: selectedTerritory.id, is_active: v })} />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Assignments */}
                      <Card>
                        <CardHeader><CardTitle className="text-sm">Entrepreneurs assignés ({assignments?.length ?? 0})</CardTitle></CardHeader>
                        <CardContent>
                          {assignments?.length ? (
                            <Table>
                              <TableHeader><TableRow>
                                <TableHead>Entreprise</TableHead><TableHead>Slot</TableHead><TableHead>AIPP</TableHead><TableHead>Actif</TableHead>
                              </TableRow></TableHeader>
                              <TableBody>
                                {assignments.map((a: any) => (
                                  <TableRow key={a.id}>
                                    <TableCell className="font-medium">{a.contractors?.business_name ?? "—"}</TableCell>
                                    <TableCell><Badge variant="outline" className="text-xs">{a.slot_type}</Badge></TableCell>
                                    <TableCell>{a.contractors?.aipp_score ?? "—"}</TableCell>
                                    <TableCell><Switch checked={a.active} onCheckedChange={(v) => toggleAssignment.mutate({ id: a.id, active: v })} /></TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : <p className="text-sm text-muted-foreground">Aucun entrepreneur assigné.</p>}
                        </CardContent>
                      </Card>

                      {/* Waitlist */}
                      <Card>
                        <CardHeader><CardTitle className="text-sm">Liste d'attente ({waitlist?.length ?? 0})</CardTitle></CardHeader>
                        <CardContent>
                          {waitlist?.length ? (
                            <Table>
                              <TableHeader><TableRow>
                                <TableHead>Entreprise</TableHead><TableHead>AIPP</TableHead><TableHead>Actions</TableHead>
                              </TableRow></TableHeader>
                              <TableBody>
                                {waitlist.map((w: any) => (
                                  <TableRow key={w.id}>
                                    <TableCell className="font-medium">{w.contractors?.business_name ?? "—"}</TableCell>
                                    <TableCell>{w.contractors?.aipp_score ?? "—"}</TableCell>
                                    <TableCell>
                                      <Button size="sm" variant="outline" onClick={() => approveWaitlist.mutate({ waitlistEntry: w, slotType: "recrue", planLevel: "recrue" })} disabled={approveWaitlist.isPending}>
                                        Approuver
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : <p className="text-sm text-muted-foreground">Aucune entrée en attente.</p>}
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <Card><CardContent className="p-8 text-center text-muted-foreground">Sélectionnez un territoire.</CardContent></Card>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── GENERATION TAB ── */}
          <TabsContent value="generate" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4" /> Génération massive</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Génère automatiquement les territoires pour toutes les combinaisons ville × catégorie avec des capacités intelligentes basées sur la taille du marché.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Villes actives:</span> <strong>{serviceAreas?.length ?? 0}</strong></div>
                  <div><span className="text-muted-foreground">Catégories actives:</span> <strong>{categories?.length ?? 0}</strong></div>
                  <div><span className="text-muted-foreground">Combinaisons max:</span> <strong>{(serviceAreas?.length ?? 0) * (categories?.length ?? 0)}</strong></div>
                  <div><span className="text-muted-foreground">Territoires existants:</span> <strong>{territories?.length ?? 0}</strong></div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" onClick={() => handleGenerate("dry_run", "admin_dry_run")} disabled={generateTerritories.isPending}>
                    Dry Run (tout le QC)
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleGenerate("dry_run", "admin_dry_run_priority", PRIORITY_CITIES)} disabled={generateTerritories.isPending}>
                    Dry Run (marchés prioritaires)
                  </Button>
                  <Button size="sm" onClick={() => handleGenerate("create_missing", "admin_create_missing", PRIORITY_CITIES)} disabled={generateTerritories.isPending}>
                    Créer manquants (prioritaires)
                  </Button>
                  <Button size="sm" onClick={() => handleGenerate("create_missing", "admin_create_all")} disabled={generateTerritories.isPending}>
                    Créer manquants (tout le QC)
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleGenerate("upsert_all", "admin_upsert_all")} disabled={generateTerritories.isPending}>
                    Écraser & régénérer tout
                  </Button>
                </div>
                {generateTerritories.isPending && <p className="text-sm text-muted-foreground animate-pulse">Génération en cours…</p>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── LOGS TAB ── */}
          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4" /> Logs de génération</CardTitle></CardHeader>
              <CardContent>
                {generationLogs?.length ? (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Date</TableHead><TableHead>Mode</TableHead><TableHead>Créés</TableHead><TableHead>Mis à jour</TableHead><TableHead>Ignorés</TableHead><TableHead>Erreurs</TableHead><TableHead>Total</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {generationLogs.map((log: any) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs">{new Date(log.created_at).toLocaleString("fr-CA")}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{log.mode}</Badge></TableCell>
                          <TableCell className="text-green-600 font-medium">{log.created_count}</TableCell>
                          <TableCell>{log.updated_count}</TableCell>
                          <TableCell className="text-muted-foreground">{log.skipped_count}</TableCell>
                          <TableCell className={log.error_count > 0 ? "text-destructive font-medium" : ""}>{log.error_count}</TableCell>
                          <TableCell>{log.total_combinations}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : <p className="text-sm text-muted-foreground">Aucun log de génération.</p>}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminTerritories;
