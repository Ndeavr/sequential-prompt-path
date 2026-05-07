/**
 * UNPRO — Private Keypad Access
 * Route: /cyndia (and /private/:slug)
 * - First visit: enter code 2x to set up
 * - Next visits: enter code → magic link → /partenaire/dashboard
 */
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Props { slug?: string }

export default function PagePrivateKeypad({ slug: slugProp }: Props) {
  const params = useParams();
  const slug = (slugProp || params.slug || "").toLowerCase();
  const [initialized, setInitialized] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [stage, setStage] = useState<"enter" | "confirm">("enter");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.functions.invoke("private-access", {
        body: { action: "check", slug },
      });
      if (error) { setError("Slug invalide"); return; }
      setInitialized(!!(data as any)?.initialized);
    })();
  }, [slug]);

  const currentValue = stage === "enter" ? pin : confirmPin;
  const setCurrent = (next: string) => stage === "enter" ? setPin(next) : setConfirmPin(next);

  const tap = (d: string) => {
    if (busy) return;
    setError(null);
    if (currentValue.length >= 4) return;
    const next = currentValue + d;
    setCurrent(next);
    if (next.length === 4) setTimeout(() => submit(next), 120);
  };
  const back = () => { if (busy) return; setError(null); setCurrent(currentValue.slice(0, -1)); };

  async function submit(code: string) {
    if (initialized === null) return;
    setBusy(true);
    try {
      if (initialized === false) {
        if (stage === "enter") {
          setStage("confirm");
          setBusy(false);
          return;
        }
        if (code !== pin) {
          setError("Les codes ne correspondent pas. Recommence.");
          setPin(""); setConfirmPin(""); setStage("enter"); setBusy(false);
          return;
        }
        const { error } = await supabase.functions.invoke("private-access", {
          body: { action: "setup", slug, code },
        });
        if (error) throw error;
        setInitialized(true);
        // immediately unlock with same code
        await unlock(code);
      } else {
        await unlock(code);
      }
    } catch (e: any) {
      setError(e?.message || "Erreur");
      setPin(""); setConfirmPin(""); setStage("enter");
    } finally {
      setBusy(false);
    }
  }

  async function unlock(code: string) {
    const { data, error } = await supabase.functions.invoke("private-access", {
      body: { action: "unlock", slug, code },
    });
    if (error) {
      setError("Code invalide");
      setPin(""); setConfirmPin(""); setStage("enter");
      return;
    }
    const link = (data as any)?.magic_link;
    if (link) window.location.href = link;
  }

  const title = useMemo(() => {
    if (initialized === null) return "Chargement…";
    if (initialized === false && stage === "enter") return "Crée ton code";
    if (initialized === false && stage === "confirm") return "Confirme ton code";
    return "Entre ton code";
  }, [initialized, stage]);

  return (
    <div className="min-h-screen bg-[#060B14] text-white flex flex-col items-center justify-center px-6 py-10">
      <div className="text-amber-400 text-xs tracking-[0.3em] uppercase mb-2">UNPRO · Accès privé</div>
      <h1 className="text-2xl font-semibold mb-1">{title}</h1>
      <p className="text-white/50 text-sm mb-8">/{slug}</p>

      <div className="flex gap-3 mb-8">
        {[0,1,2,3].map((i) => (
          <div key={i} className={`w-4 h-4 rounded-full border ${currentValue.length > i ? "bg-amber-400 border-amber-400" : "border-white/30"}`} />
        ))}
      </div>

      {error && <div className="text-red-400 text-sm mb-4">{error}</div>}

      <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
        {["1","2","3","4","5","6","7","8","9"].map((d) => (
          <button key={d} onClick={() => tap(d)} disabled={busy}
            className="h-16 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-2xl font-light transition">
            {d}
          </button>
        ))}
        <div />
        <button onClick={() => tap("0")} disabled={busy}
          className="h-16 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-2xl font-light">0</button>
        <button onClick={back} disabled={busy} className="h-16 rounded-2xl text-white/60 hover:text-white text-sm">
          ⌫
        </button>
      </div>

      {busy && <div className="mt-6 text-white/50 text-sm">…</div>}
    </div>
  );
}
