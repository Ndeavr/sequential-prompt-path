/**
 * ContractorIntakePanel — Asks the contractor for ONE entry point:
 * phone, website, RBQ, or business card photo.
 */
import { useRef, useState } from "react";
import { Phone, Globe, Hash, CreditCard, Loader2 } from "lucide-react";
import { useAlexVisualStore } from "../visual/visualStore";
import { useContractorStore } from "./contractorStore";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  actionId: string;
  onResult?: () => void;
}

type Field = "phone" | "website" | "rbq";

export default function ContractorIntakePanel({ actionId, onResult }: Props) {
  const [field, setField] = useState<Field>("website");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<HTMLInputElement>(null);
  const removeAction = useAlexVisualStore((s) => s.removeAction);
  const pushAction = useAlexVisualStore((s) => s.pushAction);
  const { setProfile, setAipp, setLoading } = useContractorStore();

  async function runImport(payload: Record<string, unknown>) {
    setBusy(true);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("alex-contractor-import", {
        body: payload,
      });
      if (error || !data?.profile) throw error || new Error("import_failed");
      setProfile(data.profile);
      if (data.aipp_report) setAipp(data.aipp_report);
      removeAction(actionId);
      pushAction({
        id: `growth-dash-${Date.now()}`,
        type: "contractor_growth_dashboard",
        payload: {},
      });
      onResult?.();
    } catch (e) {
      console.error("[ContractorIntake]", e);
    } finally {
      setBusy(false);
      setLoading(false);
    }
  }

  async function onCardChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => {
        const s = String(r.result || "");
        res(s.includes(",") ? s.split(",")[1] : s);
      };
      r.onerror = () => rej(new Error("read_failed"));
      r.readAsDataURL(file);
    });
    e.target.value = "";
    await runImport({ business_card_base64: base64, mime_type: file.type || "image/jpeg" });
  }

  function submitField() {
    if (!value.trim()) return;
    runImport({ [field]: value.trim() });
  }

  const placeholder =
    field === "phone" ? "(514) 000-0000" :
    field === "website" ? "https://votreentreprise.ca" :
    "5834-9101-01";

  const Icon = field === "phone" ? Phone : field === "website" ? Globe : Hash;

  return (
    <div className="rounded-2xl border border-primary/30 bg-card/80 backdrop-blur p-4 space-y-3">
      <div>
        <p className="text-sm font-medium text-foreground">Bâtir votre profil entrepreneur</p>
        <p className="text-xs text-muted-foreground">Une seule donnée suffit. Alex trouve le reste.</p>
      </div>

      <div className="flex gap-1.5">
        {(["website", "phone", "rbq"] as Field[]).map((f) => (
          <button
            key={f}
            onClick={() => setField(f)}
            className={`flex-1 text-xs py-1.5 rounded-lg border transition ${
              field === f
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-transparent border-border text-muted-foreground"
            }`}
          >
            {f === "website" ? "Site" : f === "phone" ? "Téléphone" : "RBQ"}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <input
          inputMode={field === "phone" ? "tel" : "text"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
        />
      </div>

      <button
        disabled={busy || !value.trim()}
        onClick={submitField}
        className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-medium active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {busy ? "Analyse en cours…" : "Analyser mon profil"}
      </button>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="flex-1 h-px bg-border" />
        <span>ou</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <button
        disabled={busy}
        onClick={() => cardRef.current?.click()}
        className="w-full rounded-xl bg-card border border-border py-2.5 text-sm font-medium flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-50"
      >
        <CreditCard className="w-4 h-4" /> Photo de votre carte d'affaires
      </button>
      <input ref={cardRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onCardChange} />
    </div>
  );
}
