/**
 * UNPRO — Broker Profile Edit Page
 */
import MainLayout from "@/layouts/MainLayout";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Save } from "lucide-react";

const SPECIALTIES = ["Résidentiel", "Condo", "Plex", "Commercial", "Luxe", "Premier acheteur", "Investissement", "Succession"];

export default function BrokerProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: broker } = useQuery({
    queryKey: ["broker-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("broker_profiles").select("*").eq("profile_id", user!.id).single();
      return data;
    },
    enabled: !!user?.id,
  });

  const [form, setForm] = useState({
    agency_name: "", city: "", license_number: "", bio: "",
    years_experience: "", avg_price_min: "", avg_price_max: "",
    style: "", specialties: [] as string[],
  });

  useEffect(() => {
    if (broker) {
      setForm({
        agency_name: broker.agency_name || "",
        city: broker.city || "",
        license_number: broker.license_number || "",
        bio: broker.bio || "",
        years_experience: broker.years_experience?.toString() || "",
        avg_price_min: broker.avg_price_min?.toString() || "",
        avg_price_max: broker.avg_price_max?.toString() || "",
        style: broker.style || "",
        specialties: (broker.specialties as string[]) || [],
      });
    }
  }, [broker]);

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("broker_profiles").update({
        agency_name: form.agency_name,
        city: form.city,
        license_number: form.license_number,
        bio: form.bio,
        years_experience: form.years_experience ? parseInt(form.years_experience) : null,
        avg_price_min: form.avg_price_min ? parseFloat(form.avg_price_min) : null,
        avg_price_max: form.avg_price_max ? parseFloat(form.avg_price_max) : null,
        style: form.style,
        specialties: form.specialties,
      }).eq("id", broker!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profil mis à jour");
      queryClient.invalidateQueries({ queryKey: ["broker-profile"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleSpec = (s: string) => {
    setForm(prev => ({
      ...prev,
      specialties: prev.specialties.includes(s) ? prev.specialties.filter(x => x !== s) : [...prev.specialties, s],
    }));
  };

  return (
    <MainLayout>
      <Helmet><title>Mon profil courtier | UNPRO</title></Helmet>
      <div className="max-w-2xl mx-auto px-5 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Mon profil courtier</h1>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Agence</Label><Input value={form.agency_name} onChange={e => setForm(p => ({ ...p, agency_name: e.target.value }))} /></div>
              <div><Label>Ville</Label><Input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} /></div>
            </div>
            <div><Label>Licence OACIQ</Label><Input value={form.license_number} onChange={e => setForm(p => ({ ...p, license_number: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Expérience (années)</Label><Input type="number" value={form.years_experience} onChange={e => setForm(p => ({ ...p, years_experience: e.target.value }))} /></div>
              <div><Label>Style</Label><Input value={form.style} onChange={e => setForm(p => ({ ...p, style: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Prix min ($)</Label><Input type="number" value={form.avg_price_min} onChange={e => setForm(p => ({ ...p, avg_price_min: e.target.value }))} /></div>
              <div><Label>Prix max ($)</Label><Input type="number" value={form.avg_price_max} onChange={e => setForm(p => ({ ...p, avg_price_max: e.target.value }))} /></div>
            </div>
            <div>
              <Label>Spécialités</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {SPECIALTIES.map(s => (
                  <Badge key={s} variant={form.specialties.includes(s) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleSpec(s)}>{s}</Badge>
                ))}
              </div>
            </div>
            <div><Label>Bio</Label><Textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} rows={4} /></div>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="w-full">
              <Save className="h-4 w-4 mr-2" /> {mutation.isPending ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
