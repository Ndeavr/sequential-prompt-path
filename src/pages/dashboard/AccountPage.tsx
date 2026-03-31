import { useState } from "react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { PageHeader, LoadingState } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ProfileForm {
  salutation: string;
  first_name: string;
  last_name: string;
  phone: string;
}

const AccountPage = () => {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const [form, setForm] = useState<ProfileForm | null>(null);

  const current: ProfileForm = form ?? {
    salutation: profile?.salutation ?? "",
    first_name: profile?.first_name ?? "",
    last_name: profile?.last_name ?? "",
    phone: profile?.phone ?? "",
  };

  if (isLoading) return <DashboardLayout><LoadingState /></DashboardLayout>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const full_name = [current.first_name, current.last_name].filter(Boolean).join(" ");
      await updateProfile.mutateAsync({
        salutation: current.salutation || null,
        first_name: current.first_name || null,
        last_name: current.last_name || null,
        full_name: full_name || null,
        phone: current.phone || null,
      });
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
              <Label htmlFor="salutation">Salutation</Label>
              <Select value={current.salutation} onValueChange={(v) => setForm({ ...current, salutation: v })}>
                <SelectTrigger id="salutation">
                  <SelectValue placeholder="Sélectionner…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M.">M.</SelectItem>
                  <SelectItem value="Mme">Mme</SelectItem>
                  <SelectItem value="Mx">Mx</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="first_name">Prénom</Label>
                <Input id="first_name" value={current.first_name} onChange={(e) => setForm({ ...current, first_name: e.target.value })} placeholder="Jean" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Nom</Label>
                <Input id="last_name" value={current.last_name} onChange={(e) => setForm({ ...current, last_name: e.target.value })} placeholder="Tremblay" />
              </div>
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
