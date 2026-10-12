/**
 * UNPRO — 5 choix RBQ (auto-déclaration). Enregistre rbq_declaration (DECLARED).
 * Ne peut jamais marquer « vérifiée » : la base refuse toute auto-validation.
 */
import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { normalizeRbq, isValidRbq } from "@/utils/formatRbqNeq";
import {
  RBQ_DECLARATION_OPTIONS,
  getRbqDashboardState,
  type RbqDeclaration,
  type RbqDeclarationDetails,
} from "@/lib/compliance/rbqDeclaration";
import { cn } from "@/lib/utils";

const SITUATIONS: { value: NonNullable<RbqDeclarationDetails["situation"]>; label: string }[] = [
  { value: "expired", label: "Licence expirée" },
  { value: "suspended", label: "Licence suspendue" },
  { value: "revoked", label: "Licence révoquée" },
  { value: "other_body", label: "Licence d'un autre organisme (CMEQ, CMMTQ…)" },
  { value: "subcontractors", label: "J'utilise des sous-traitants licenciés" },
  { value: "other", label: "Autre" },
];

interface Props {
  profile: any;
  onSaved?: () => void;
}

export default function RbqSituationSelector({ profile, onSaved }: Props) {
  const initialDetails: RbqDeclarationDetails = (profile?.rbq_declaration_details as RbqDeclarationDetails) || {};
  const [choice, setChoice] = useState<RbqDeclaration | null>((profile?.rbq_declaration as RbqDeclaration) || null);
  const [rbq, setRbq] = useState<string>(profile?.rbq_number || "");
  const [d, setD] = useState<RbqDeclarationDetails>(initialDetails);
  const [claraStep, setClaraStep] = useState<0 | 1>(initialDetails.activities ? 1 : 0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setChoice((profile?.rbq_declaration as RbqDeclaration) || null);
    setRbq(profile?.rbq_number || "");
    setD((profile?.rbq_declaration_details as RbqDeclarationDetails) || {});
  }, [profile?.id, profile?.rbq_declaration, profile?.rbq_number]);

  const verified = profile?.rbq_compliance_status === "verified" && !!profile?.rbq_number;
  const state = getRbqDashboardState(profile || {});
  const set = (k: keyof RbqDeclarationDetails) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setD((x) => ({ ...x, [k]: e.target.value }));

  const canSave = (() => {
    if (!choice) return false;
    if (choice === "has_license") return isValidRbq(rbq);
    if (choice === "not_required") return !!d.activities?.trim();
    if (choice === "unsure") return !!d.activities?.trim();
    if (choice === "other") return !!d.situation;
    if (choice === "employer_licensed") return !!d.employer_relationship && (d.employer_relationship === "independent" || (!!d.employer_legal_name?.trim() && isValidRbq(d.employer_rbq || "") && !!d.activities?.trim()));
    return true;
  })();

  const save = async () => {
    if (!profile?.id || !choice || !canSave) return;
    setSaving(true);
    const clean: RbqDeclarationDetails = {};
    if (d.activities?.trim()) clean.activities = d.activities.trim().slice(0, 500);
    if (d.reason?.trim()) clean.reason = d.reason.trim().slice(0, 500);
    if (choice === "in_progress" && d.expected_date) clean.expected_date = d.expected_date;
    if (choice === "other" && d.situation) clean.situation = d.situation;
    if (choice === "employer_licensed") {
      clean.employer_relationship = d.employer_relationship;
      if (d.employer_legal_name?.trim()) clean.employer_legal_name = d.employer_legal_name.trim().slice(0, 200);
      if (d.employer_rbq) clean.employer_rbq = normalizeRbq(d.employer_rbq);
    }
    if (d.notes?.trim()) clean.notes = d.notes.trim().slice(0, 500);
    const update: Record<string, unknown> = {
      rbq_declaration: choice,
      rbq_declaration_details: clean,
      rbq_declared_at: new Date().toISOString(),
    };
    if (choice === "has_license") {
      update.rbq_number = normalizeRbq(rbq);
      update.rbq_compliance_status = "in_progress"; // vérification serveur/admin requise
    } else if (choice === "in_progress") {
      update.rbq_compliance_status = "in_progress";
    }
    const { error } = await supabase.from("contractors").update(update as any).eq("id", profile.id);
    setSaving(false);
    if (error) {
      toast.error("Impossible d'enregistrer pour le moment. Réessayez.");
      return;
    }
    toast.success("Situation RBQ enregistrée. UNPRO va l'examiner.");
    onSaved?.();
  };

  if (verified) {
    return (
      <div className="rounded-2xl border border-border/50 p-4 bg-card/60" data-testid="rbq-situation-verified">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Licence RBQ vérifiée · {profile.rbq_number}
        </p>
        <p className="text-xs text-muted-foreground mt-1">Statut : VÉRIFIÉ. Pour corriger, contactez UNPRO.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="rbq-situation-selector">
      <div>
        <p className="text-sm font-semibold text-foreground">Votre situation RBQ</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Statut actuel : <span className="font-semibold text-foreground">{state.marker === "DECLARED" ? "DÉCLARÉ" : state.marker === "PENDING" ? "EN ATTENTE" : state.marker === "INFERRED" ? "INFÉRÉ" : "VÉRIFIÉ"}</span> — {state.title}
        </p>
      </div>
      <div role="radiogroup" aria-label="Situation de licence RBQ" className="space-y-2">
        {RBQ_DECLARATION_OPTIONS.map((o) => {
          const selected = choice === o.value;
          return (
            <button
              type="button"
              key={o.value}
              role="radio"
              aria-checked={selected}
              data-testid={`rbq-opt-${o.value}`}
              onClick={() => setChoice(o.value)}
              className={cn(
                "w-full min-h-[52px] text-left rounded-2xl border px-4 py-3 transition-colors",
                selected ? "border-primary bg-primary/10" : "border-border/60 bg-card/60",
              )}
            >
              <span className="flex items-start gap-3">
                <span className={cn("mt-1 h-4 w-4 shrink-0 rounded-full border-2", selected ? "border-primary bg-primary" : "border-muted-foreground")} />
                <span>
                  <span className="block text-sm font-medium text-foreground">{o.label}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">{o.hint}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {choice === "has_license" && (
        <div className="space-y-1.5">
          <Label htmlFor="rbq-num">Numéro RBQ</Label>
          <Input id="rbq-num" inputMode="numeric" value={rbq} onChange={(e) => setRbq(e.target.value)} placeholder="1234-5678-90" />
          <p className="text-xs text-muted-foreground">Vérifié par UNPRO au registre officiel. Le statut devient « Vérifié » seulement après ce résultat.</p>
        </div>
      )}

      {choice === "not_required" && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="rbq-act">Quels travaux précis faites-vous?</Label>
            <Textarea id="rbq-act" rows={2} value={d.activities || ""} onChange={set("activities")} placeholder="Ex. : entretien paysager, lavage de vitres, déneigement…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rbq-reason">Raison (facultatif)</Label>
            <Input id="rbq-reason" value={d.reason || ""} onChange={set("reason")} />
          </div>
          <p className="text-xs text-muted-foreground">Déclaration (DÉCLARÉ). UNPRO vérifie que ces travaux ne sont pas réglementés avant toute recommandation.</p>
        </div>
      )}

      {choice === "in_progress" && (
        <div className="space-y-1.5">
          <Label htmlFor="rbq-date">Date prévue (facultatif)</Label>
          <Input id="rbq-date" type="date" value={d.expected_date || ""} onChange={set("expected_date")} />
          <p className="text-xs text-muted-foreground">Aucun mandat de travaux réglementés avant une licence valide.</p>
        </div>
      )}

      {choice === "unsure" && (
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4 space-y-2">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Sparkles className="w-4 h-4 text-primary" /> Clara
          </p>
          {claraStep === 0 || !d.activities ? (
            <>
              <Label htmlFor="rbq-unsure">Quels travaux exacts faites-vous chez vos clients?</Label>
              <Textarea id="rbq-unsure" rows={2} value={d.activities || ""} onChange={set("activities")} />
              <Button type="button" variant="outline" size="sm" disabled={!d.activities?.trim()} onClick={() => setClaraStep(1)}>Continuer</Button>
            </>
          ) : (
            <>
              <Label htmlFor="rbq-unsure2">Touchez-vous à la structure, l'électricité, la plomberie, le gaz ou la toiture? (facultatif)</Label>
              <Textarea id="rbq-unsure2" rows={2} value={d.notes || ""} onChange={set("notes")} />
            </>
          )}
          <p className="text-xs text-muted-foreground">Ceci n'est pas un avis juridique. UNPRO examinera vos travaux et vous avisera.</p>
        </div>
      )}

      {choice === "employer_licensed" && (
        <div className="space-y-3" data-testid="rbq-employer-fields">
          <p className="text-sm font-medium text-foreground">Quel est votre lien avec cette entreprise?</p>
          <div role="radiogroup" aria-label="Lien avec l'entreprise titulaire" className="grid gap-2">
            {([
              ["employee", "Employé ou salarié de l'entreprise"],
              ["representative", "Représentant mandaté par l'entreprise"],
              ["independent", "Sous-traitant ou travailleur indépendant"],
            ] as const).map(([v, l]) => (
              <button type="button" key={v} role="radio" aria-checked={d.employer_relationship === v}
                data-testid={`rbq-rel-${v}`}
                onClick={() => setD((x) => ({ ...x, employer_relationship: v }))}
                className={cn("min-h-11 rounded-xl border px-3 text-left text-sm text-foreground", d.employer_relationship === v ? "border-primary bg-primary/10" : "border-border/60")}
              >{l}</button>
            ))}
          </div>
          {d.employer_relationship === "independent" ? (
            <p className="text-xs text-foreground rounded-xl border border-border/60 p-3">
              Un sous-traitant doit détenir sa propre licence RBQ pour les travaux réglementés (Loi sur le bâtiment, art. 46). La licence d'une autre entreprise ne peut pas être prêtée ni utilisée, même avec une autorisation. Choisissez « Ma licence est en cours d'obtention » ou enregistrez pour un examen de conformité.
            </p>
          ) : d.employer_relationship ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="emp-name">Nom légal de l'entreprise titulaire</Label>
                <Input id="emp-name" value={d.employer_legal_name || ""} onChange={set("employer_legal_name")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emp-rbq">Numéro RBQ de l'entreprise</Label>
                <Input id="emp-rbq" inputMode="numeric" value={d.employer_rbq || ""} onChange={set("employer_rbq")} placeholder="1234-5678-90" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emp-act">Travaux exacts que vous faites</Label>
                <Textarea id="emp-act" rows={2} value={d.activities || ""} onChange={set("activities")} />
              </div>
              <p className="text-xs text-muted-foreground">
                Un responsable autorisé de l'entreprise devra confirmer par écrit. Les contrats et paiements des clients restent au nom de l'entreprise titulaire. Cette autorisation ne vous donne pas de licence.
              </p>
            </>
          ) : null}
        </div>
      )}

      {choice === "other" && (
        <div className="space-y-3">
          <div role="radiogroup" aria-label="Précisez la situation" className="grid gap-2">
            {SITUATIONS.map((s) => (
              <button
                type="button" key={s.value} role="radio" aria-checked={d.situation === s.value}
                onClick={() => setD((x) => ({ ...x, situation: s.value }))}
                className={cn("min-h-11 rounded-xl border px-3 text-left text-sm", d.situation === s.value ? "border-primary bg-primary/10 text-foreground" : "border-border/60 text-foreground")}
              >{s.label}</button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rbq-notes">Détails (facultatif)</Label>
            <Textarea id="rbq-notes" rows={2} value={d.notes || ""} onChange={set("notes")} />
          </div>
          <p className="text-xs text-muted-foreground">Une licence expirée, suspendue ou révoquée bloque les travaux réglementés. Une licence d'un autre organisme ne remplace pas la RBQ sans vérification.</p>
        </div>
      )}

      {choice && (
        <Button type="button" className="w-full h-12 rounded-2xl" disabled={!canSave || saving} onClick={save} data-testid="rbq-save">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enregistrer ma situation RBQ"}
        </Button>
      )}
    </div>
  );
}
