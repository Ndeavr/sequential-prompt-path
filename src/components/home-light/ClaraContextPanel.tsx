import { useState } from "react";
import { Building2, CheckCircle2, FileSearch, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVerifyContractor } from "@/hooks/useVerifyContractor";
import type { VerificationOutput } from "@/types/verification";

export type ClaraSurfaceMode =
  | "IDLE"
  | "LISTENING"
  | "ANALYZING"
  | "PHOTO"
  | "DOCUMENT"
  | "QUOTE"
  | "CONTRACTOR"
  | "PROJECT"
  | "MATCH"
  | "APPOINTMENT";

interface Props {
  mode: ClaraSurfaceMode;
  quoteCount: number;
  statusText?: string | null;
}

const modeCopy: Partial<Record<ClaraSurfaceMode, { title: string; detail: string }>> = {
  PHOTO: { title: "Photo", detail: "Ajoutez une image nette de la zone à comprendre." },
  DOCUMENT: { title: "Document", detail: "Le document restera lié à cette conversation." },
  QUOTE: { title: "Analyse de soumissions", detail: "Ajoutez jusqu’à trois PDF ou images." },
  PROJECT: { title: "Projet", detail: "Clara précise le besoin une question à la fois." },
  MATCH: { title: "Jumelage", detail: "La recommandation apparaîtra seulement après les validations requises." },
  APPOINTMENT: { title: "Rendez-vous", detail: "Les disponibilités seront revalidées avant confirmation." },
};

export default function ClaraContextPanel({ mode, quoteCount, statusText }: Props) {
  const verification = useVerifyContractor();
  const [businessName, setBusinessName] = useState("");
  const [website, setWebsite] = useState("");
  const [rbq, setRbq] = useState("");
  const [result, setResult] = useState<VerificationOutput | null>(null);

  const verify = async () => {
    const response = await verification.mutateAsync({
      form: {
        business_name: businessName || undefined,
        website: website || undefined,
        rbq_number: rbq || undefined,
      },
    });
    setResult(response.output);
  };

  if (mode === "CONTRACTOR") {
    return (
      <aside className="home-clara-context" aria-label="Entreprise">
        <div className="home-context-heading">
          <Building2 aria-hidden="true" />
          <div><p>Entreprise</p><span>Une information suffit pour commencer.</span></div>
        </div>
        <div className="home-context-fields">
          <Input value={businessName} onChange={(event) => setBusinessName(event.target.value)} placeholder="Nom de l’entreprise" aria-label="Nom de l’entreprise" />
          <Input value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="Site Web" aria-label="Site Web" inputMode="url" />
          <Input value={rbq} onChange={(event) => setRbq(event.target.value)} placeholder="Numéro RBQ" aria-label="Numéro RBQ" inputMode="numeric" />
        </div>
        <Button type="button" onClick={verify} disabled={verification.isPending || (!businessName.trim() && !website.trim() && !rbq.trim())} className="w-full">
          <ShieldCheck aria-hidden="true" />
          {verification.isPending ? "Vérification en cours…" : "Vérifier l’entreprise"}
        </Button>
        {verification.isError && <p role="alert" className="home-context-status">Je n’ai pas pu confirmer cette entreprise. Ajoutez un autre identifiant.</p>}
        {result && (
          <div className="home-context-result">
            <div><CheckCircle2 aria-hidden="true" /><strong>{result.identity_resolution.matched_entity.business_name || "Entreprise analysée"}</strong></div>
            <p>{result.identity_resolution.summary}</p>
            <span>État : {result.identity_resolution.status === "verified_match" || result.identity_resolution.status === "verified_internal_profile" ? "VÉRIFIÉ" : "À CONFIRMER"}</span>
          </div>
        )}
      </aside>
    );
  }

  const copy = modeCopy[mode];
  if (!copy) return null;

  return (
    <aside className="home-clara-context" aria-label={copy.title}>
      <div className="home-context-heading">
        <FileSearch aria-hidden="true" />
        <div><p>{copy.title}</p><span>{copy.detail}</span></div>
      </div>
      {mode === "QUOTE" && (
        <div className="home-quote-progress" aria-label={`${quoteCount} soumission sur 3`}>
          {[0, 1, 2].map((index) => <span key={index} className={index < quoteCount ? "is-filled" : ""} />)}
          <small>{quoteCount}/3</small>
        </div>
      )}
      {statusText && <p className="home-context-status" aria-live="polite">{statusText}</p>}
    </aside>
  );
}