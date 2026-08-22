/**
 * UNPRO — Admin : « Compatibilité & projets recherchés » sur la fiche entrepreneur.
 * Lecture des données réelles uniquement. Les préférences déduites sont badgées et non bloquantes.
 */
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Pencil, Sparkles } from "lucide-react";
import {
  COMPAT_PREQUAL,
  COMPAT_PROJECT_QUESTIONS,
  COMPAT_SERVICES,
  PREQUAL_LEVEL_LABEL,
  STANCE_LABEL,
  TERRITORY_TIER_LABEL,
  TRI_LABEL,
  formatMoney,
  type PrequalLevel,
  type Stance,
  type TerritoryTier,
  type TriAnswer,
} from "@/config/compatibilityExcavation";
import { useCompatibilitySnapshot } from "@/hooks/useContractorCompatibility";

const serviceLabel = (slug: string) => COMPAT_SERVICES.find((s) => s.slug === slug)?.label ?? slug;
const projectLabel = (dim: string, key: string) =>
  COMPAT_PROJECT_QUESTIONS.find((q) => q.dimension === dim && q.key === key)?.label ?? `${dim}:${key}`;
const prequalLabel = (c: string) => COMPAT_PREQUAL.find((p) => p.criterion === c)?.label ?? c;

export default function CompatibilityAdminPanel({ contractorId }: { contractorId: string }) {
  const { data, isLoading } = useCompatibilitySnapshot(contractorId);

  if (isLoading) {
    return (
      <Card><CardHeader><CardTitle className="text-base">Compatibilité & projets recherchés</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">Chargement…</p></CardContent></Card>
    );
  }

  const profile = data?.profile;
  const inferred = (data?.rules ?? []).filter((r: any) => r.source === "inferred");

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Compatibilité & projets recherchés</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {profile
              ? `Dernière mise à jour : ${new Date(profile.updated_at).toLocaleDateString("fr-CA")}`
              : "Profil de compatibilité jamais rempli"}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to={`/admin/contractors/${contractorId}/compatibilite`}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Modifier
          </Link>
        </Button>
      </CardHeader>

      <CardContent className="space-y-5">
        {!profile ? (
          <p className="text-sm text-muted-foreground">
            Aucune donnée. Ouvrez « Modifier » pour remplir le profil avec l'entrepreneur.
          </p>
        ) : (
          <>
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Complétion</span>
                <span>{profile.completion_pct}%</span>
              </div>
              <Progress value={profile.completion_pct} className="mt-1.5 h-1.5" />
            </div>

            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Services</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(data?.services ?? []).map((s: any) => (
                  <Badge
                    key={s.id}
                    variant={s.stance === "not_wanted" ? "destructive" : s.stance === "priority" ? "default" : "secondary"}
                  >
                    {serviceLabel(s.service_slug)} · {STANCE_LABEL[s.stance as Stance]}
                    {s.min_project_cents ? ` · min ${formatMoney(s.min_project_cents)}` : ""}
                  </Badge>
                ))}
                {!(data?.services ?? []).length && <span className="text-sm text-muted-foreground">—</span>}
              </div>
            </section>

            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Projets et contraintes</p>
              <ul className="mt-2 space-y-1 text-sm">
                {(data?.projects ?? []).map((p: any) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-2">
                    <span className="text-foreground">{projectLabel(p.dimension, p.key)}</span>
                    <Badge variant={p.answer === "no" ? "destructive" : p.answer === "depends" ? "outline" : "secondary"}>
                      {TRI_LABEL[p.answer as TriAnswer]}
                    </Badge>
                    {p.condition_note && <span className="text-xs text-muted-foreground">« {p.condition_note} »</span>}
                  </li>
                ))}
                {!(data?.projects ?? []).length && <li className="text-muted-foreground">—</li>}
              </ul>
            </section>

            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Territoires</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(data?.territories ?? []).map((t: any) => (
                  <Badge key={t.id} variant={t.tier === "blocked" ? "destructive" : "secondary"}>
                    {t.city_name} · {TERRITORY_TIER_LABEL[t.tier as TerritoryTier]}
                    {t.min_project_cents ? ` · min ${formatMoney(t.min_project_cents)}` : ""}
                  </Badge>
                ))}
                {!(data?.territories ?? []).length && <span className="text-sm text-muted-foreground">—</span>}
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Argent</p>
                <p className="mt-1.5 text-sm text-foreground">
                  Plancher {formatMoney(profile.floor_project_cents)} · Idéal{" "}
                  {formatMoney(profile.ideal_project_min_cents)} – {formatMoney(profile.ideal_project_max_cents)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Capacité</p>
                <p className="mt-1.5 text-sm text-foreground">
                  {(profile.summary as any)?.capacity?.projects_per_month ?? "—"} projets/mois ·{" "}
                  {(profile.summary as any)?.capacity?.lead_time_weeks ?? "—"} sem. de délai
                  {(profile.summary as any)?.capacity?.paused ? " · EN PAUSE" : ""}
                </p>
              </div>
            </section>

            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Avant le rendez-vous</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(data?.prequal ?? []).filter((p: any) => p.level !== "optional").map((p: any) => (
                  <Badge key={p.id} variant={p.level === "required" ? "default" : "outline"}>
                    {prequalLabel(p.criterion)} · {PREQUAL_LEVEL_LABEL[p.level as PrequalLevel]}
                  </Badge>
                ))}
                {!(data?.prequal ?? []).some((p: any) => p.level !== "optional") && (
                  <span className="text-sm text-muted-foreground">Aucune exigence</span>
                )}
              </div>
            </section>

            {(profile.critical_notes ?? []).length > 0 && (
              <section>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Questions critiques</p>
                <ul className="mt-1.5 list-disc pl-5 text-sm text-foreground">
                  {(profile.critical_notes as string[]).map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              </section>
            )}

            {inferred.length > 0 && (
              <section>
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" /> Préférences déduites (non bloquantes)
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {inferred.map((r: any) => (
                    <Badge key={r.id} variant="outline">INFERRED · {r.rule_key}</Badge>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
