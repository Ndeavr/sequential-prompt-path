import { useState } from "react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { PageHeader, LoadingState } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const AccountPage = () => {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const [form, setForm] = useState<{ full_name: string; phone: string } | null>(null);

  const current = form ?? { full_name: profile?.full_name ?? "", phone: profile?.phone ?? "" };

  if (isLoading) return <DashboardLayout><LoadingState /></DashboardLayout>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile.mutateAsync({ full_name: current.full_name, phone: current.phone });
      toast.success("Profil mis à jour !");
      setForm(null);
    } catch {
      toast.error("Erreur lors de la mise à jour.");
    }
  };

  return (
    <DashboardLayout>
      <PageHeader title="Mon compte" description="Gérez vos informations personnelles" />
      <Card className="max-w-lg">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Courriel</Label>
              <Input value={user?.email ?? ""} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="full_name">Nom complet</Label>
              <Input id="full_name" value={current.full_name} onChange={(e) => setForm({ ...current, full_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" value={current.phone} onChange={(e) => setForm({ ...current, phone: e.target.value })} placeholder="514-555-1234" />
            </div>
            <Button type="submit" disabled={updateProfile.isPending}>{updateProfile.isPending ? "Enregistrement…" : "Enregistrer"}</Button>
          </form>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default AccountPage;
