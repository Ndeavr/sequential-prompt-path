/**
 * UNPRO — Admin : correction ciblée du profil de compatibilité (services, territoires, argent, capacité).
 * Chaque changement est journalisé champ par champ côté serveur (admin_action_logs).
 */
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SlidersHorizontal } from "lucide-react";
import {
  COMPAT_SERVICES,
  STANCE_LABEL,
  TERRITORY_TIER_LABEL,
  type Stance,
  type TerritoryTier,
} from "@/config/compatibilityExcavation";
import {
  useCompatibilityAdminPatch,
  type CompatibilityAnswers,
  type TerritoryPref,
} from "@/hooks/useContractorCompatibility";

const toCents = (v: string): number | null => {
  const n = Number(String(v).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
};
const toDollars = (c?: number | null): string => (c == null ? "" : String(Math.round(c / 100)));

interface Props {
  contractorId: string;
  answers: Partial<CompatibilityAnswers> | null | undefined;
}

export default function CompatibilityAdminEditor({ contractorId, answers }: Props) {
  const [open, setOpen] = useState(false);
  const { patch, saving } = useCompatibilityAdminPatch(contractorId);

  const initial = useMemo(
    () => ({
      services: (answers?.services ?? {}) as CompatibilityAnswers["services"],
      territories: (answers?.territories ?? []) as TerritoryPref[],
      money: (answers?.money ?? {}) as CompatibilityAnswers["money"],
      capacity: (answers?.capacity ?? {}) as CompatibilityAnswers["capacity"],
    }),
    [answers],
  );

  const [services, setServices] = useState(initial.services);
  const [territories, setTerritories] = useState<TerritoryPref[]>(initial.territories);
  const [money, setMoney] = useState(initial.money);
  const [capacity, setCapacity] = useState(initial.capacity);

  const reset = () => {
    setServices(initial.services);
    setTerritories(initial.territories);
    setMoney(initial.money);
    setCapacity(initial.capacity);
  };

  const submit = async () => {
    const res = await patch({ services, territories, money, capacity });
    if (res?.ok) setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" /> Ajuster
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajuster la compatibilité</DialogTitle>
          <DialogDescription>
            Correction assistée par un agent UNPRO. Chaque changement est journalisé.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-3">
          <div className="space-y-6">
            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Services</p>
              {COMPAT_SERVICES.map((s) => {
                const cur = services?.[s.slug];
                return (
                  <div key={s.slug} className="grid grid-cols-[1fr_auto] items-center gap-2">
                    <div>
                      <p className="text-sm text-foreground">{s.label}</p>
                      <Input
                        className="mt-1 h-8 w-32"
                        inputMode="numeric"
                        placeholder="Min $"
                        value={toDollars(cur?.min_project_cents)}
                        onChange={(e) =>
                          setServices((p) => ({
                            ...p,
                            [s.slug]: { stance: cur?.stance ?? "accepted", min_project_cents: toCents(e.target.value) },
                          }))
                        }
                      />
                    </div>
                    <Select
                      value={cur?.stance ?? "accepted"}
                      onValueChange={(v) =>
                        setServices((p) => ({
                          ...p,
                          [s.slug]: { stance: v as Stance, min_project_cents: cur?.min_project_cents ?? null },
                        }))
                      }
                    >
                      <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(STANCE_LABEL) as Stance[]).map((k) => (
                          <SelectItem key={k} value={k}>{STANCE_LABEL[k]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </section>

            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Territoires</p>
              {territories.length === 0 && (
                <p className="text-sm text-muted-foreground">Aucun territoire déclaré.</p>
              )}
              {territories.map((t, i) => (
                <div key={t.city_slug} className="grid grid-cols-[1fr_auto] items-center gap-2">
                  <div>
                    <p className="text-sm text-foreground">{t.city_name}</p>
                    <Input
                      className="mt-1 h-8 w-32"
                      inputMode="numeric"
                      placeholder="Min $"
                      value={toDollars(t.min_project_cents)}
                      onChange={(e) =>
                        setTerritories((p) =>
                          p.map((x, idx) => (idx === i ? { ...x, min_project_cents: toCents(e.target.value) } : x)),
                        )
                      }
                    />
                  </div>
                  <Select
                    value={t.tier}
                    onValueChange={(v) =>
                      setTerritories((p) => p.map((x, idx) => (idx === i ? { ...x, tier: v as TerritoryTier } : x)))
                    }
                  >
                    <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TERRITORY_TIER_LABEL) as TerritoryTier[]).map((k) => (
                        <SelectItem key={k} value={k}>{TERRITORY_TIER_LABEL[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="floor" className="text-xs">Plancher de projet ($)</Label>
                <Input
                  id="floor"
                  inputMode="numeric"
                  className="mt-1"
                  value={toDollars(money?.floor_project_cents)}
                  onChange={(e) => setMoney((p) => ({ ...p, floor_project_cents: toCents(e.target.value) }))}
                />
              </div>
              <div>
                <Label htmlFor="ideal-min" className="text-xs">Projet idéal min ($)</Label>
                <Input
                  id="ideal-min"
                  inputMode="numeric"
                  className="mt-1"
                  value={toDollars(money?.ideal_min_cents)}
                  onChange={(e) => setMoney((p) => ({ ...p, ideal_min_cents: toCents(e.target.value) }))}
                />
              </div>
              <div>
                <Label htmlFor="ppm" className="text-xs">Projets par mois</Label>
                <Input
                  id="ppm"
                  inputMode="numeric"
                  className="mt-1"
                  value={capacity?.projects_per_month ?? ""}
                  onChange={(e) =>
                    setCapacity((p) => ({
                      ...p,
                      projects_per_month: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="lead" className="text-xs">Délai (semaines)</Label>
                <Input
                  id="lead"
                  inputMode="numeric"
                  className="mt-1"
                  value={capacity?.lead_time_weeks ?? ""}
                  onChange={(e) =>
                    setCapacity((p) => ({
                      ...p,
                      lead_time_weeks: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                />
              </div>
            </section>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Agenda en pause</p>
                <p className="text-xs text-muted-foreground">Retire l'entrepreneur des recommandations actives.</p>
              </div>
              <Switch
                checked={!!capacity?.paused}
                onCheckedChange={(v) => setCapacity((p) => ({ ...p, paused: v }))}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Annuler</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer les changements"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
