/** Clara contractor workspace v1: private presence preview + factual work panel. */
import { useCallback, useEffect, useState } from "react";
import { Check, CircleDashed, Clock, HelpCircle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildClaraWorkItems, type AccountEvidence, type DraftEvidence, type WorkState } from "@/lib/claraContractorWorkspace";
import { loadContractorAccountEvidence } from "@/services/claraContractorWorkService";
import { questionsForTrade } from "@/lib/matching/matchingQuestions";

const ICON: Record<WorkState, typeof Check> = { done: Check, pending: Clock, not_done: CircleDashed, unknown: HelpCircle };
const TONE: Record<WorkState, string> = { done: "text-success", pending: "text-primary", not_done: "text-muted-foreground", unknown: "text-muted-foreground" };

export function ClaraWorkPanel({ fr, draft, returnedFromCheckout = false }: { fr: boolean; draft?: DraftEvidence | null; returnedFromCheckout?: boolean }) {
  const [account, setAccount] = useState<AccountEvidence | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try { setAccount(await loadContractorAccountEvidence()); }
    catch { setAccount({ signedIn: true, activation: "unknown", publication: "unknown", appointments: null }); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const items = buildClaraWorkItems({ draft, account, returnedFromCheckout }, fr);
  return (
    <section className="rounded-2xl border border-border bg-card p-4" data-testid="clara-work-panel" aria-busy={loading}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{fr ? "Le travail de Clara pour votre entreprise" : "Clara's work for your business"}</h2>
        <Button type="button" variant="ghost" size="sm" className="min-h-11 shrink-0" onClick={() => void load()} disabled={loading} aria-label={fr ? "Actualiser" : "Refresh"}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
        </Button>
      </div>
      <ul className="mt-3 space-y-3">
        {items.map(item => {
          const Icon = ICON[item.state];
          return (
            <li key={item.key} className="flex items-start gap-3" data-state={item.state} data-item={item.key}>
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${TONE[item.state]}`} aria-hidden />
              <div className="min-w-0 text-sm">
                <p className="font-medium text-foreground">{item.title}</p>
                {item.detail && <p className="break-words text-muted-foreground">{item.detail}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

type Answers = Record<string, unknown>;
const list = (v: unknown) => (Array.isArray(v) ? (v as unknown[]).filter((x): x is string => typeof x === "string" && x.trim().length > 0) : []);

/** Private preview composed only from the confirmed dossier; never published here. */
export function PresencePreview({ fr, name, website, city, trade, answers }: { fr: boolean; name: string; website: string; city: string | null; trade: string | null; answers: Answers }) {
  const questions = questionsForTrade(trade);
  const optionLabel = (key: string, value: string) => {
    const option = questions.find(q => q.key === key)?.options?.find(o => o.value === value);
    return option ? (fr ? option.label : option.label_en) : value;
  };
  const services = list(answers.services_wanted);
  const refused = list(answers.services_refused);
  const territories = list(answers.territories);
  const languages = list(answers.languages).map(v => optionLabel("languages", v));
  const credentials = list(answers.credentials).filter(v => v !== "none").map(v => optionLabel("credentials", v));
  const description = typeof answers.company_description === "string" ? answers.company_description.trim() : "";
  let domain = "";
  try { domain = website ? new URL(website).hostname.replace(/^www\./, "") : ""; } catch { domain = ""; }

  return (
    <section className="rounded-[24px] border border-border bg-card p-5" data-testid="presence-preview">
      <p className="inline-flex rounded-full border border-border px-2.5 py-1 text-[11.5px] font-semibold text-muted-foreground">
        {fr ? "Aperçu privé · non publié" : "Private preview · not published"}
      </p>
      <h2 className="mt-3 break-words text-xl font-bold text-foreground">{name}</h2>
      {[trade, city, domain].filter(Boolean).length > 0 && <p className="mt-1 break-words text-sm text-muted-foreground">{[trade, city, domain].filter(Boolean).join(" · ")}</p>}
      <p className="mt-3 text-sm leading-relaxed text-foreground">{description || (fr ? "Description à compléter." : "Description to complete.")}</p>
      <dl className="mt-4 space-y-3 text-sm">
        {[
          [fr ? "Projets recherchés" : "Projects wanted", services.join(", ")],
          [fr ? "Travaux non acceptés" : "Work not accepted", refused.join(", ")],
          [fr ? "Territoires" : "Service areas", territories.join(", ")],
          [fr ? "Langues" : "Languages", languages.join(", ")],
        ].map(([label, value]) => (
          <div key={label}><dt className="font-medium">{label}</dt><dd className="break-words text-muted-foreground">{value || (fr ? "À compléter" : "To complete")}</dd></div>
        ))}
        <div>
          <dt className="font-medium">{fr ? "Licences et couvertures" : "Licences and coverage"}</dt>
          <dd className="break-words text-muted-foreground">
            {credentials.length ? `${credentials.join(", ")} · ${fr ? "Déclaré, vérification UNPRO à venir" : "Declared, UNPRO verification pending"}` : (fr ? "Aucune déclarée" : "None declared")}
          </dd>
        </div>
      </dl>
    </section>
  );
}
