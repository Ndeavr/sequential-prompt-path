import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ISR_SIGNATURE_FEATURES,
  ISR_PROMO_CODE,
  ISR_BRAND,
  ISR_NO_DOWNGRADE_LINE,
} from "@/config/isrDemoConfig";

interface Props {
  demoRunId: string | null;
}

export default function IsrSignaturePanel({ demoRunId }: Props) {
  const [code, setCode] = useState("");
  const [promoState, setPromoState] = useState<"idle" | "valid" | "invalid">("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyPromo = () => {
    if (code.trim().toUpperCase() === ISR_PROMO_CODE) {
      setPromoState("valid");
      setError(null);
    } else {
      setPromoState("invalid");
    }
  };

  const startCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "create-isr-demo-checkout",
        {
          body: {
            plan: "Signature",
            promo_code: ISR_PROMO_CODE,
            contractor_name: ISR_BRAND.company,
            demo_run_id: demoRunId,
          },
        },
      );
      if (fnError) throw fnError;
      if (!data?.url) throw new Error("Aucune URL de paiement reçue.");
      window.location.href = data.url;
    } catch (e) {
      setError((e as Error).message ?? "Erreur lors de l'ouverture du paiement.");
      setLoading(false);
    }
  };

  const isValid = promoState === "valid";

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-5 sm:p-6 text-white">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-amber-300/80">Plan recommandé</div>
          <div className="mt-1 text-2xl font-semibold tracking-[-0.03em]">Signature</div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-semibold ${isValid ? "text-white/40 line-through" : "text-white"}`}>
            1 799$<span className="text-sm font-normal text-white/40">/mois</span>
          </div>
          {isValid && (
            <div className="text-2xl font-semibold text-amber-300">
              1$<span className="text-sm font-normal text-amber-200/70"> CAD démo</span>
            </div>
          )}
        </div>
      </div>

      <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-white/85">
        {ISR_SIGNATURE_FEATURES.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-300" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-xs text-white/60">
        {ISR_NO_DOWNGRADE_LINE}
      </div>

      <div className="mt-5">
        <label className="text-[11px] uppercase tracking-[0.2em] text-white/40">Code privé démo</label>
        <div className="mt-2 flex gap-2">
          <input
            value={code}
            onChange={(e) => { setCode(e.target.value); setPromoState("idle"); }}
            placeholder="Saisir le code"
            className="flex-1 rounded-[14px] border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-cyan-300/40"
          />
          <button
            onClick={applyPromo}
            className="rounded-[14px] border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white hover:bg-white/[0.1] transition-all"
          >
            Appliquer
          </button>
        </div>
        {promoState === "valid" && (
          <div className="mt-2 text-xs text-emerald-300">
            Code appliqué: Signature activé à 1$ pour cette démo.
          </div>
        )}
        {promoState === "invalid" && (
          <div className="mt-2 text-xs text-red-300">Code invalide pour cette démo.</div>
        )}
      </div>

      <div className="mt-5 text-[11px] text-white/45">
        Ce test active uniquement une transaction démo à 1$. Le plan Signature réel demeure 1 799$/mois.
      </div>

      <button
        onClick={startCheckout}
        disabled={!isValid || loading}
        className="mt-3 w-full rounded-[18px] bg-amber-300 px-5 py-3.5 text-sm font-semibold text-[#050816] hover:-translate-y-0.5 transition-all duration-[420ms] [transition-timing-function:cubic-bezier(.22,1,.36,1)] disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0"
      >
        {loading ? "Ouverture du paiement…" : "Activer Signature pour 1$"}
      </button>

      {error && <div className="mt-2 text-xs text-red-300">{error}</div>}

      <div className="mt-3 text-center text-[11px] text-white/45">
        Rendez-vous exclusifs garantis. Pas des leads partagés.
      </div>
    </div>
  );
}
