/**
 * /pro/activate — Activation entrepreneur (Mission 48H).
 * Formulaire ultra-court + Offre Fondateur 149$/mo + checkout direct.
 */
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { trackFirstCustomerEvent } from "@/utils/trackFirstCustomerEvent";
import FounderOfferCard from "@/components/first-customer-48h/FounderOfferCard";

export default function PageProActivate() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [form, setForm] = useState({
    company: params.get("company") ?? "",
    name: "",
    phone: "",
    email: params.get("email") ?? "",
    trade: params.get("trade") ?? "",
    city: params.get("city") ?? "",
    website: "",
  });
  const prospectId = params.get("prospect") ?? "";

  useEffect(() => {
    trackFirstCustomerEvent("activation_started", { has_prospect: !!prospectId });
  }, [prospectId]);

  const startCheckout = async () => {
    if (!form.company || !form.email) {
      toast.error("Entreprise et courriel requis pour continuer");
      return;
    }
    setLoading(true);
    setCheckoutUrl(null);
    try {
      let pid = prospectId;
      if (!pid) {
        const { data } = await supabase.functions.invoke("pro-score-instant", {
          body: form,
        });
        pid = (data as any)?.prospect_id ?? "";
      }
      trackFirstCustomerEvent("checkout_started", { prospect_id: pid });
      const { data: c, error } = await supabase.functions.invoke(
        "pro-founder-checkout-guest",
        {
          body: { prospectId: pid, email: form.email, planSlug: "fondateur-149" },
        },
      );
      if (error) throw error;
      if ((c as any)?.error) throw new Error((c as any).error);
      const url = (c as any)?.url;
      if (!url) throw new Error("Aucune URL de paiement reçue");
      setCheckoutUrl(url);
      // Best-effort auto-redirect for environments without iframes.
      try {
        if (window.top && window.top !== window.self) {
          window.top.location.href = url;
        } else {
          window.location.href = url;
        }
      } catch {
        // cross-origin top → user clicks the visible link below.
      }
    } catch (err: any) {
      toast.error(err.message ?? "Impossible de démarrer le paiement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Activer mon profil — UNPRO Fondateur</title>
        <meta
          name="description"
          content="Devenez entrepreneur Fondateur UNPRO. 149$/mois. Recevez des rendez-vous exclusifs."
        />
      </Helmet>
      <div className="min-h-screen px-4 py-8 md:py-12" style={{ background: "#0B1220" }}>
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => navigate("/")}
            className="text-[12px] font-semibold mb-4 opacity-70 hover:opacity-100"
            style={{ color: "#fff" }}
          >
            ← Retour
          </button>

          <h1
            className="text-[24px] md:text-[30px] font-extrabold mb-2"
            style={{ color: "#fff", letterSpacing: "-0.03em" }}
          >
            Activer votre profil entrepreneur
          </h1>
          <p className="text-[13.5px] mb-6" style={{ color: "rgba(255,255,255,0.75)" }}>
            30 secondes. Profil activé immédiatement après paiement.
          </p>

          <div
            className="rounded-3xl p-5 md:p-6 border space-y-3 mb-5"
            style={{
              background: "rgba(255,255,255,0.04)",
              borderColor: "rgba(255,255,255,0.12)",
              backdropFilter: "blur(20px)",
            }}
          >
            {[
              { name: "company", label: "Entreprise", required: true },
              { name: "name", label: "Votre nom" },
              { name: "phone", label: "Téléphone", type: "tel" },
              { name: "email", label: "Courriel", type: "email", required: true },
              { name: "trade", label: "Métier" },
              { name: "city", label: "Ville" },
              { name: "website", label: "Site web (facultatif)", type: "url" },
            ].map((f) => (
              <label key={f.name} className="block">
                <span
                  className="block text-[11.5px] font-semibold mb-1 uppercase tracking-wider"
                  style={{ color: "rgba(255,255,255,0.7)" }}
                >
                  {f.label}
                  {f.required && <span style={{ color: "#F5C85A" }}> *</span>}
                </span>
                <input
                  name={f.name}
                  type={f.type ?? "text"}
                  required={f.required}
                  value={(form as any)[f.name]}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, [f.name]: e.target.value }))
                  }
                  className="w-full px-3 py-2.5 rounded-xl text-[14px] focus:outline-none focus:ring-2"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.16)",
                    color: "#fff",
                  }}
                />
              </label>
            ))}
          </div>

          <FounderOfferCard onActivate={startCheckout} loading={loading} checkoutUrl={checkoutUrl} />
        </div>
      </div>
    </>
  );
}
