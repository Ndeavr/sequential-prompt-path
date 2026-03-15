/**
 * UNPRO — Admin Verified Contractors Management
 * List contractors with admin verification controls.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { useAdminVerifiedContractors, useAdminVerifyContractor } from "@/hooks/useAdminVerification";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ShieldCheck, ShieldAlert, Search, Eye, Pencil } from "lucide-react";
import { toast } from "sonner";

export default function AdminVerifiedContractors() {
  const { data: contractors, isLoading } = useAdminVerifiedContractors();
  const verifyMutation = useAdminVerifyContractor();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editScore, setEditScore] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const filtered = (contractors ?? []).filter((c: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.business_name?.toLowerCase().includes(s) ||
      c.city?.toLowerCase().includes(s) ||
      c.rbq_number?.includes(s) ||
      c.phone?.includes(s)
    );
  });

  const handleUpdate = async (contractorId: string, adminVerified: boolean) => {
    try {
      await verifyMutation.mutateAsync({
        contractorId,
        adminVerified,
        internalVerifiedScore: editScore ? parseInt(editScore) : undefined,
        verificationNotes: editNotes || undefined,
      });
      toast.success(adminVerified ? "Entrepreneur vérifié." : "Vérification retirée.");
      setEditingId(null);
      setEditScore("");
      setEditNotes("");
    } catch {
      toast.error("Erreur.");
    }
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Entrepreneurs vérifiés"
        description="Gestion des statuts de vérification admin"
      />

      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom, ville, RBQ, téléphone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading && <LoadingState />}

      {!isLoading && filtered.length === 0 && (
        <EmptyState message="Aucun entrepreneur trouvé." />
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="border border-border/40 rounded-xl overflow-hidden bg-card/60">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Entreprise</TableHead>
                  <TableHead className="text-xs">Ville</TableHead>
                  <TableHead className="text-xs">RBQ</TableHead>
                  <TableHead className="text-xs">Téléphone</TableHead>
                  <TableHead className="text-xs text-center">Vérifié</TableHead>
                  <TableHead className="text-xs text-center">Score</TableHead>
                  <TableHead className="text-xs">Statut</TableHead>
                  <TableHead className="text-xs">Mis à jour</TableHead>
                  <TableHead className="text-xs w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c: any) => (
                  <TableRow key={c.id} className="hover:bg-muted/30">
                    <TableCell className="text-sm font-medium max-w-[180px] truncate">{c.business_name || "—"}</TableCell>
                    <TableCell className="text-xs">{c.city || "—"}</TableCell>
                    <TableCell className="text-xs font-mono">{c.rbq_number || "—"}</TableCell>
                    <TableCell className="text-xs">{c.phone || "—"}</TableCell>
                    <TableCell className="text-center">
                      {c.admin_verified ? (
                        <ShieldCheck className="h-4 w-4 text-success mx-auto" />
                      ) : (
                        <ShieldAlert className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center text-sm font-semibold">
                      {c.internal_verified_score ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{c.verification_status || "—"}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.updated_at ? new Date(c.updated_at).toLocaleDateString("fr-CA") : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Link to={`/admin/contractors/${c.id}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button>
                        </Link>
                        <Dialog open={editingId === c.id} onOpenChange={(o) => { setEditingId(o ? c.id : null); if (!o) { setEditScore(""); setEditNotes(""); } }}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>{c.admin_verified ? "Mettre à jour" : "Vérifier"} — {c.business_name}</DialogTitle></DialogHeader>
                            <div className="space-y-3">
                              <div>
                                <label className="text-xs text-muted-foreground">Score interne</label>
                                <Input type="number" min={0} max={100} placeholder="0-100" value={editScore} onChange={(e) => setEditScore(e.target.value)} />
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground">Notes</label>
                                <Textarea placeholder="Notes internes…" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} />
                              </div>
                            </div>
                            <DialogFooter className="gap-2">
                              {c.admin_verified && (
                                <Button variant="outline" onClick={() => handleUpdate(c.id, false)} disabled={verifyMutation.isPending}>
                                  Retirer la vérification
                                </Button>
                              )}
                              <Button onClick={() => handleUpdate(c.id, true)} disabled={verifyMutation.isPending}>
                                <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                                {c.admin_verified ? "Mettre à jour" : "Vérifier"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
