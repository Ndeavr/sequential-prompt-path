/**
 * UNPRO — Admin Reward Rules Dashboard
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Settings2, Trophy, Zap } from "lucide-react";
import { toast } from "sonner";

interface RewardRule {
  id: string;
  name: string;
  owner_role: string;
  feature: string | null;
  city: string | null;
  conversion_type: string;
  required_count: number;
  reward_type: string;
  reward_value: any;
  priority: number;
  is_active: boolean;
}

export default function AdminRewardRules() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["admin-reward-rules"],
    queryFn: async () => {
      const { data } = await supabase
        .from("reward_rules" as any)
        .select("*")
        .order("priority", { ascending: false });
      return (data || []) as unknown as RewardRule[];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await supabase.from("reward_rules" as any).update({ is_active: active }).eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reward-rules"] });
      toast.success("Règle mise à jour");
    },
  });

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Settings2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Règles de récompenses</h1>
              <p className="text-sm text-muted-foreground">Configurer les milestones et récompenses</p>
            </div>
          </div>
          <CreateRuleDialog open={showCreate} onOpenChange={setShowCreate} onCreated={() => qc.invalidateQueries({ queryKey: ["admin-reward-rules"] })} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{rules.length}</p>
            <p className="text-xs text-muted-foreground">Total règles</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-500">{rules.filter(r => r.is_active).length}</p>
            <p className="text-xs text-muted-foreground">Actives</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{rules.filter(r => !r.is_active).length}</p>
            <p className="text-xs text-muted-foreground">Inactives</p>
          </CardContent></Card>
        </div>

        {/* Rules list */}
        <div className="space-y-3">
          {isLoading ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Chargement...</CardContent></Card>
          ) : rules.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Aucune règle configurée</CardContent></Card>
          ) : rules.map(rule => (
            <Card key={rule.id} className="border-border/50">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Trophy className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{rule.name}</p>
                    <Badge variant="secondary" className="text-[10px]">{rule.owner_role}</Badge>
                    {rule.feature && <Badge variant="outline" className="text-[10px]">{rule.feature}</Badge>}
                    {rule.city && <Badge variant="outline" className="text-[10px]">{rule.city}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {rule.required_count}× {rule.conversion_type} → {rule.reward_type} (priorité: {rule.priority})
                  </p>
                </div>
                <Switch
                  checked={rule.is_active}
                  onCheckedChange={(checked) => toggleMutation.mutate({ id: rule.id, active: checked })}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function CreateRuleDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: "", owner_role: "homeowner", feature: "", city: "",
    conversion_type: "design_render", required_count: 3,
    reward_type: "perk", priority: 0,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await supabase.from("reward_rules" as any).insert([{
        name: form.name,
        owner_role: form.owner_role,
        feature: form.feature || null,
        city: form.city || null,
        conversion_type: form.conversion_type,
        required_count: form.required_count,
        reward_type: form.reward_type,
        reward_value: { label: form.reward_type },
        priority: form.priority,
      }]);
    },
    onSuccess: () => {
      onCreated();
      onOpenChange(false);
      toast.success("Règle créée");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />Nouvelle règle</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nouvelle règle de récompense</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nom</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Règle cuisine Montréal" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Rôle</Label>
              <Select value={form.owner_role} onValueChange={v => setForm(f => ({ ...f, owner_role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="homeowner">Propriétaire</SelectItem>
                  <SelectItem value="contractor">Entrepreneur</SelectItem>
                  <SelectItem value="condo">Condo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Type conversion</Label>
              <Select value={form.conversion_type} onValueChange={v => setForm(f => ({ ...f, conversion_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="design_render">Design</SelectItem>
                  <SelectItem value="home_score_reveal">Score</SelectItem>
                  <SelectItem value="booking_submitted">Booking</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Feature (optionnel)</Label><Input value={form.feature} onChange={e => setForm(f => ({ ...f, feature: e.target.value }))} placeholder="kitchen" /></div>
            <div><Label>Ville (optionnel)</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="montreal" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Requis</Label><Input type="number" value={form.required_count} onChange={e => setForm(f => ({ ...f, required_count: +e.target.value }))} /></div>
            <div><Label>Récompense</Label>
              <Select value={form.reward_type} onValueChange={v => setForm(f => ({ ...f, reward_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="perk">Perk</SelectItem>
                  <SelectItem value="coffee">Café</SelectItem>
                  <SelectItem value="badge">Badge</SelectItem>
                  <SelectItem value="boost">Boost</SelectItem>
                  <SelectItem value="featured">Vedette</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Priorité</Label><Input type="number" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: +e.target.value }))} /></div>
          </div>
          <Button onClick={() => createMutation.mutate()} disabled={!form.name || createMutation.isPending} className="w-full">
            {createMutation.isPending ? "Création..." : "Créer la règle"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
