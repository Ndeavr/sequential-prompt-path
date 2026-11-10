/**
 * CalendarIntegrationRequest — "Mon agenda est dans un CRM ou une autre plateforme".
 * Clara asks one detail at a time and records a REQUEST through the
 * request_calendar_integration RPC. A request is never a connection: nothing
 * here shows "connecté", and no password, token or key is ever asked for.
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";

type Scope = "read_availability" | "book_appointments" | "two_way_sync";
const SCOPES: Array<{ id: Scope; label: string }> = [
  { id: "read_availability", label: "Lire mes disponibilités" },
  { id: "book_appointments", label: "Ajouter les rendez-vous UNPRO" },
  { id: "two_way_sync", label: "Synchroniser dans les deux sens" },
];
const STATUS_LABEL: Record<string, string> = {
  received: "reçue",
  in_progress: "en cours d'étude",
  available: "intégration disponible",
  declined: "non retenue pour l'instant",
};

/** Same refusal as the server: Clara never needs credentials. */
export const CREDENTIAL_PATTERN = /(mot de passe|password|passwd|\bmdp\b|token|jeton|api[ _-]?key|cl[ée] api|secret|bearer|\botp\b)|[A-Za-z0-9_-]{32,}/i;

const ERRORS: Record<string, string> = {
  auth_required: "Connectez-vous pour envoyer la demande.",
  credentials_refused: "Retirez tout mot de passe, jeton ou clé : Clara n'en a jamais besoin.",
  invalid_url: "Le lien doit commencer par https:// et ne contenir aucun paramètre.",
  rate_limited: "Vous avez déjà envoyé plusieurs demandes aujourd'hui. Réessayez demain.",
};

type Step = "closed" | "software" | "docs" | "holder" | "scopes" | "consent" | "sending" | "done";

interface Props { surface?: string }

export default function CalendarIntegrationRequest({ surface = "calendar_hub" }: Props) {
  const [step, setStep] = useState<Step>("closed");
  const [software, setSoftware] = useState("");
  const [docs, setDocs] = useState("");
  const [holder, setHolder] = useState("");
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ duplicate: boolean; status: string } | null>(null);
  const [mine, setMine] = useState<Array<{ id: string; software_name: string; status: string }>>([]);

  const loadMine = async () => {
    const { data } = await supabase
      .from("calendar_integration_requests")
      .select("id, software_name, status")
      .order("created_at", { ascending: false })
      .limit(5);
    setMine((data as typeof mine | null) ?? []);
  };
  useEffect(() => { void loadMine(); }, []);

  const guard = (value: string, next: Step) => {
    if (CREDENTIAL_PATTERN.test(value)) { setError(ERRORS.credentials_refused); return; }
    setError(null);
    setStep(next);
  };

  const submit = async (consent: boolean) => {
    setStep("sending");
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("request_calendar_integration", {
      p_software_name: software.trim(),
      p_account_holder_name: holder.trim(),
      p_integration_scopes: scopes,
      p_contact_consent: consent,
      p_documentation_url: docs.trim() || null,
      p_source_surface: surface,
    });
    const payload = data as { result?: string; status?: string } | null;
    if (rpcError || !payload?.result) {
      const code = Object.keys(ERRORS).find((k) => rpcError?.message?.includes(k));
      setError(code ? ERRORS[code] : "La demande n'a pas pu être enregistrée. Réessayez.");
      setStep(code === "invalid_url" ? "docs" : code === "credentials_refused" ? "software" : "consent");
      return;
    }
    setResult({ duplicate: payload.result === "duplicate", status: payload.status ?? "received" });
    setStep("done");
    void loadMine();
  };

  const field = (value: string, set: (v: string) => void, label: string, type = "text") => (
    <Input aria-label={label} type={type} value={value} onChange={(e) => set(e.target.value)} className="h-11 text-base" maxLength={type === "url" ? 500 : 160} />
  );

  return (
    <div className="space-y-3 rounded-xl border border-border/50 bg-background/50 p-4">
      {step === "closed" && (
        <Button variant="outline" className="w-full h-11" onClick={() => setStep("software")}>
          Mon agenda est dans un CRM ou une autre plateforme
        </Button>
      )}

      {step !== "closed" && step !== "done" && (
        <p className="text-meta text-muted-foreground">
          Demander une intégration · Ne partagez jamais de mot de passe ni de jeton.
        </p>
      )}

      {step === "software" && (
        <div className="space-y-2">
          <p className="text-body text-foreground">Quel logiciel utilisez-vous pour votre agenda?</p>
          {field(software, setSoftware, "Nom du logiciel")}
          <Button className="h-11" disabled={software.trim().length < 2} onClick={() => guard(software, "docs")}>Continuer</Button>
        </div>
      )}

      {step === "docs" && (
        <div className="space-y-2">
          <p className="text-body text-foreground">Avez-vous un lien vers sa documentation? (facultatif)</p>
          {field(docs, setDocs, "Lien de documentation", "url")}
          <div className="flex flex-wrap gap-2">
            <Button className="h-11" disabled={!docs.trim()} onClick={() => guard(docs, "holder")}>Continuer</Button>
            <Button variant="ghost" className="h-11" onClick={() => { setDocs(""); setError(null); setStep("holder"); }}>Passer</Button>
          </div>
        </div>
      )}

      {step === "holder" && (
        <div className="space-y-2">
          <p className="text-body text-foreground">À quel nom de professionnel ou d'entreprise est ce compte?</p>
          {field(holder, setHolder, "Nom du compte")}
          <Button className="h-11" disabled={holder.trim().length < 2} onClick={() => guard(holder, "scopes")}>Continuer</Button>
        </div>
      )}

      {step === "scopes" && (
        <div className="space-y-2">
          <p className="text-body text-foreground">Que voulez-vous qu'UNPRO fasse avec cet agenda?</p>
          {SCOPES.map((s) => (
            <label key={s.id} className="flex items-center gap-3 min-h-11 text-body text-foreground">
              <Checkbox
                checked={scopes.includes(s.id)}
                onCheckedChange={(v) => setScopes((cur) => (v ? [...cur, s.id] : cur.filter((x) => x !== s.id)))}
              />
              {s.label}
            </label>
          ))}
          <Button className="h-11" disabled={!scopes.length} onClick={() => setStep("consent")}>Continuer</Button>
        </div>
      )}

      {step === "consent" && (
        <div className="space-y-2">
          <p className="text-body text-foreground">Pouvons-nous vous contacter au sujet de cette intégration seulement?</p>
          <div className="flex flex-wrap gap-2">
            <Button className="h-11" onClick={() => void submit(true)}>Oui, vous pouvez me contacter</Button>
            <Button variant="outline" className="h-11" onClick={() => void submit(false)}>Non, enregistrer seulement</Button>
          </div>
        </div>
      )}

      {step === "sending" && <p className="text-meta text-muted-foreground">Envoi de la demande…</p>}

      {step === "done" && result && (
        <div role="status" className="space-y-1">
          <p className="text-body text-foreground">
            {result.duplicate
              ? `Votre demande pour ${software.trim()} est déjà enregistrée (${STATUS_LABEL[result.status] ?? result.status}).`
              : `Demande reçue pour ${software.trim()}.`}
          </p>
          <p className="text-meta text-muted-foreground">
            Aucune connexion n'est active avec ce logiciel pour l'instant. Google Agenda reste disponible en attendant.
          </p>
        </div>
      )}

      {error && <p role="alert" className="text-meta text-destructive">{error}</p>}

      {mine.length > 0 && (
        <ul aria-label="Mes demandes d'intégration" className="space-y-1 text-meta text-muted-foreground">
          {mine.map((r) => (
            <li key={r.id}>{r.software_name} — demande {STATUS_LABEL[r.status] ?? r.status}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
