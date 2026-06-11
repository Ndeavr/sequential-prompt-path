/**
 * /pro/score — Score IA instantané pour entrepreneurs (Mission 48H).
 */
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { trackFirstCustomerEvent } from "@/utils/trackFirstCustomerEvent";
import ScoreRevealCard from "@/components/first-customer-48h/ScoreRevealCard";

interface Scores {
  visibility: number;
  trust: number;
  authority: number;
  profile: number;
  growth: number;
}

export default function PageProScoreInstant() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    company: "",
    website: "",
    city: "",
    phone: "",
    email: "",
    trade: "",
  });
  const [result, setResult] = useState<{
    prospect_id: string;
    scores: Scores;
    opportunities: string[];
  } | null>(null);

  useEffect(() => {
    trackFirstCustomerEvent("score_started");
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company || !form.email) {
      toast.error("Entreprise et courriel requis");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("pro-score-instant", {
        body: form,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult(data as any);
      trackFirstCustomerEvent("score_completed", { trade: form.trade, city: form.city });
    } catch (err: any) {
      toast.error(err.message ?? "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const goActivate = () => {
    trackFirstCustomerEvent("activation_started", { from: "score" });
    const params = new URLSearchParams({
      prospect: result?.prospect_id ?? "",
      company: form.company,
      email: form.email,
      city: form.city,
      trade: form.trade,
    });
    navigate(`/pro/activate?${params.toString()}`);
  };

  return (
    <>
      <Helmet>
        <title>Mon score IA — UNPRO Entrepreneur</title>
        <meta
          name="description"
          content="Découvrez ce que les moteurs IA comprennent de votre entreprise. Analyse instantanée et gratuite."
        />
      </Helmet>
      <div className="min-h-screen px-4 py-8 md:py-12" style={{ background: "#F7F6F0" }}>
        <div className="max-w-xl mx-auto">
          <button
            onClick={() => navigate("/")}
            className="text-[12px] font-semibold mb-4 opacity-70 hover:opacity-100"
            style={{ color: "#0B1220" }}
          >
            ← Retour à l'accueil
          </button>

          <h1
            className="text-[26px] md:text-[32px] font-extrabold mb-2"
            style={{ color: "#0B1220", letterSpacing: "-0.03em" }}
          >
            Voyez ce que l'IA comprend de votre entreprise
          </h1>
          <p className="text-[14px] mb-6" style={{ color: "#475569" }}>
            Analyse instantanée. Aucune carte de crédit requise.
          </p>

          {!result ? (
            <form
              onSubmit={submit}
              className="rounded-3xl p-5 md:p-6 border bg-white space-y-3"
              style={{ borderColor: "rgba(11,18,32,0.08)" }}
            >
              {[
                { name: "company", label: "Entreprise", required: true },
                { name: "website", label: "Site web (facultatif)", type: "url" },
                { name: "city", label: "Ville" },
                { name: "phone", label: "Téléphone", type: "tel" },
                { name: "email", label: "Courriel", type: "email", required: true },
                { name: "trade", label: "Métier (ex. plomberie, toiture)" },
              ].map((f) => (
                <label key={f.name} className="block">
                  <span className="block text-[12px] font-semibold mb-1" style={{ color: "#334155" }}>
                    {f.label}
                    {f.required && <span style={{ color: "#F97316" }}> *</span>}
                  </span>
                  <input
                    name={f.name}
                    type={f.type ?? "text"}
                    required={f.required}
                    value={(form as any)[f.name]}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, [f.name]: e.target.value }))
                    }
                    className="w-full px-3 py-2.5 rounded-xl border text-[14px] focus:outline-none focus:ring-2"
                    style={{
                      borderColor: "rgba(11,18,32,0.12)",
                      background: "#FAFAF7",
                    }}
                  />
                </label>
              ))}
              <button
                type="submit"
                disabled={loading}
                className="w-full px-5 py-3.5 rounded-2xl font-bold text-[14.5px] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #2563FF 0%, #3B82F6 100%)",
                  color: "#fff",
                  boxShadow: "0 12px 24px -8px rgba(37,99,255,0.45)",
                }}
              >
                {loading ? "Analyse en cours…" : "Analyser mon entreprise"}
              </button>
            </form>
          ) : (
            <ScoreRevealCard
              scores={result.scores}
              opportunities={result.opportunities}
              onActivate={goActivate}
            />
          )}
        </div>
      </div>
    </>
  );
}
