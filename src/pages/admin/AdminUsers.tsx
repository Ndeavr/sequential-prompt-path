import { useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAdminUsers } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserPlus, Trash2, Shield, Loader2 } from "lucide-react";

const ALL_ROLES = ["homeowner", "contractor", "admin"] as const;
const PLAN_OPTIONS = [
  { value: "", label: "Aucun plan" },
  { value: "recrue", label: "Recrue" },
  { value: "starter", label: "Starter" },
  { value: "pro", label: "Pro" },
  { value: "elite", label: "Élite" },
];

const AdminUsers = () => {
  const { data: users, isLoading } = useAdminUsers();
  const queryClient = useQueryClient();
  const [editUser, setEditUser] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const handleAddRole = async (userId: string, role: string) => {
    setSaving(true);
    try {
      const { error } = await supabase.from("user_roles").upsert(
        { user_id: userId, role: role as any },
        { onConflict: "user_id,role" }
      );
      if (error) throw error;

      // If adding contractor role, ensure contractor record exists
      if (role === "contractor") {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email, phone")
          .eq("user_id", userId)
          .maybeSingle();

        await (supabase.from("contractors") as any).upsert(
          {
            user_id: userId,
            business_name: profile?.full_name || "",
            email: profile?.email || "",
            phone: profile?.phone || "",
          },
          { onConflict: "user_id" }
        );
      }

      toast.success(`Rôle "${role}" ajouté`);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveRole = async (userId: string, role: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role as any);
      if (error) throw error;
      toast.success(`Rôle "${role}" retiré`);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const handleAssignPlan = async (userId: string, planCode: string) => {
    setSaving(true);
    try {
      // Get contractor ID
      const { data: contractor } = await (supabase.from("contractors") as any)
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!contractor) {
        toast.error("Aucun profil entrepreneur trouvé. Ajoutez d'abord le rôle entrepreneur.");
        return;
      }

      if (!planCode) {
        // Remove subscription
        await supabase
          .from("contractor_subscriptions")
          .delete()
          .eq("contractor_id", contractor.id);
        toast.success("Plan retiré");
      } else {
        await supabase.from("contractor_subscriptions").upsert(
          {
            contractor_id: contractor.id,
            plan_id: planCode,
            status: "active",
            started_at: new Date().toISOString(),
          } as any,
          { onConflict: "contractor_id" }
        );
        toast.success(`Plan "${planCode}" assigné`);
      }
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <PageHeader title="Utilisateurs" description="Liste des utilisateurs inscrits — Gestion des rôles et plans" />
      {isLoading ? <LoadingState /> : !users?.length ? <EmptyState message="Aucun utilisateur." /> : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Courriel</TableHead>
                <TableHead>Rôles</TableHead>
                <TableHead>Inscription</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const missingRoles = ALL_ROLES.filter(r => !u.roles.includes(r));
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.email || "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((role: string) => (
                          <Badge key={role} variant="secondary" className="gap-1 pr-1">
                            {role}
                            <button
                              onClick={() => handleRemoveRole(u.user_id, role)}
                              disabled={saving}
                              className="ml-0.5 hover:text-destructive transition-colors"
                              title={`Retirer ${role}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                        {u.roles.length === 0 && (
                          <span className="text-muted-foreground text-xs">Aucun rôle</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(u.created_at).toLocaleDateString("fr-CA")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {missingRoles.length > 0 && (
                          <Select onValueChange={(role) => handleAddRole(u.user_id, role)} disabled={saving}>
                            <SelectTrigger className="h-8 w-[140px] text-xs">
                              <SelectValue placeholder="+ Ajouter rôle" />
                            </SelectTrigger>
                            <SelectContent>
                              {missingRoles.map(r => (
                                <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {u.roles.includes("contractor") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs gap-1"
                            onClick={() => setEditUser(u)}
                          >
                            <Shield className="h-3 w-3" /> Plan
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Plan Assignment Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assigner un plan — {editUser?.full_name || editUser?.email}</DialogTitle>
          </DialogHeader>
          <Select onValueChange={(plan) => {
            handleAssignPlan(editUser?.user_id, plan);
            setEditUser(null);
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un plan" />
            </SelectTrigger>
            <SelectContent>
              {PLAN_OPTIONS.map(p => (
                <SelectItem key={p.value || "none"} value={p.value || "none"}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Annuler</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminUsers;
