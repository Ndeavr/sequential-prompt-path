import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ShieldCheck, Sparkles } from "lucide-react";

export default function PageActivationSprint() {
  const { slug } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [prospect, setProspect] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!slug) return;
      const { data } = await supabase
        .from("v_sms_sprint_landing")
        .select("*")
        .eq("tracking_slug", slug)
        .maybeSingle();
      setProspect(data);
      setLoading(false);
      // fire activation_view
      await supabase.from("sms_sprint_link_events").insert({
        tracking_slug: slug,
        event: "activation_view",
        meta: { c: params.get("c") ?? null },
      });
    })();
  }, [slug, params]);

  async function activate() {
    if (!slug) return;
    setBusy(true); setErr(null);
    try {
      const { data, error } = await supabase.functions.invoke("sms-sprint-checkout", {
        body: { slug, email: email || undefined },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
      else throw new Error("no_checkout_url");
    } catch (e: any) {
      setErr(e?.message ?? "Erreur");
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="alex-immersive min-h-screen flex items-center justify-center bg-[#050816] text-white">
        <Loader2 className="w-6 h-6 animate-spin opacity-70" />
      </div>
    );
  }

  return (
    <div className="alex-immersive min-h-screen bg-[#050816] text-white">
      <div className="max-w-lg mx-auto px-6 pt-16 pb-24">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/60 mb-8">
          <Sparkles className="w-3.5 h-3.5" /> UNPRO Founder Access
        </div>

        <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight mb-4">
          Rendez-vous exclusifs garantis. <br />
          <span className="text-white/70">Pas des leads partagés.</span>
        </h1>

        <p className="text-white/80 text-lg leading-relaxed mb-8">
          UNPRO aide les propriétaires à trouver le bon entrepreneur grâce à l'IA.
          Les entrepreneurs sélectionnés peuvent activer leur profil IA pour <span className="font-semibold text-white">1$</span>.
        </p>

        {prospect && (
          <div className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-5 mb-8">
            <div className="text-xs uppercase tracking-widest text-white/50 mb-2">Invité</div>
            <div className="text-lg font-medium">{prospect.company_name ?? "Entrepreneur qualifié"}</div>
            <div className="text-sm text-white/60 mt-1">
              {[prospect.city, prospect.category].filter(Boolean).join(" • ")}
            </div>
          </div>
        )}

        <label className="block text-sm text-white/70 mb-2">Courriel (optionnel)</label>
        <Input
          type="email"
          placeholder="vous@entreprise.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 bg-white/[0.04] border-white/10 text-white placeholder:text-white/40"
        />

        <Button
          onClick={activate}
          disabled={busy}
          className="w-full h-14 text-base font-semibold rounded-2xl bg-white text-[#050816] hover:bg-white/90"
        >
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : "Activer pour 1$"}
        </Button>

        {err && <div className="mt-3 text-sm text-red-400">{err}</div>}

        <div className="mt-8 flex items-center gap-2 text-xs text-white/50">
          <ShieldCheck className="w-4 h-4" />
          Paiement sécurisé Stripe • Aucun engagement
        </div>
      </div>
    </div>
  );
}
