/**
 * PageInvitationEdit — /invitation/:token/edit
 * Progressive draft save (800ms debounce) via edge invitation-save-draft.
 */
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

interface Draft {
  business_name: string;
  contact_first_name: string;
  contact_last_name: string;
  phone: string;
  email: string;
  website: string;
  category: string;
  city: string;
}

const EMPTY: Draft = {
  business_name: "", contact_first_name: "", contact_last_name: "",
  phone: "", email: "", website: "", category: "", city: "",
};

export default function PageInvitationEdit() {
  const { token } = useParams<{ token: string }>();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("invitation-resolve", { body: { token } });
        if (error || !data?.prospect) { setNotFound(true); setLoading(false); return; }
        const p = data.prospect;
        const parts = (p.contact_name ?? "").split(" ");
        setDraft({
          business_name: p.business_name ?? "",
          contact_first_name: parts[0] ?? "",
          contact_last_name: parts.slice(1).join(" ") ?? "",
          phone: p.phone ?? "",
          email: p.email ?? "",
          website: p.website ?? "",
          category: p.category ?? "",
          city: p.city ?? "",
        });
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  function update<K extends keyof Draft>(key: K, value: string) {
    setDraft(d => ({ ...d, [key]: value }));
    if (timerRef.current) clearTimeout(timerRef.current);
    setSaving("saving");
    timerRef.current = setTimeout(async () => {
      try {
        await supabase.functions.invoke("invitation-save-draft", {
          body: { token, patch: { [key]: value } },
        });
        setSaving("saved");
      } catch {
        setSaving("idle");
      }
    }, 800);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050816] text-white flex items-center justify-center">
        <p className="text-white/70">Chargement…</p>
      </main>
    );
  }
  if (notFound) {
    return (
      <main className="min-h-screen bg-[#050816] text-white flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold mb-2">Cette invitation n'existe plus.</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <section className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-6">
          <Link to={`/invitation/${token}`} className="text-sm text-white/60 hover:text-white">← Retour</Link>
          <SaveIndicator state={saving} />
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-[-0.02em] mb-2">
          Vérifiez vos informations
        </h1>
        <p className="text-white/70 mb-8">
          Les changements sont sauvegardés automatiquement.
        </p>

        <div className="space-y-5">
          <Field label="Nom de l'entreprise" value={draft.business_name} onChange={v => update("business_name", v)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Prénom du responsable" value={draft.contact_first_name} onChange={v => update("contact_first_name", v)} />
            <Field label="Nom du responsable" value={draft.contact_last_name} onChange={v => update("contact_last_name", v)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Téléphone mobile" value={draft.phone} onChange={v => update("phone", v)} placeholder="(514) 555-1234" />
            <Field label="Courriel" value={draft.email} onChange={v => update("email", v)} placeholder="nom@entreprise.ca" />
          </div>
          <Field label="Site web" value={draft.website} onChange={v => update("website", v)} placeholder="https://" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Catégorie" value={draft.category} onChange={v => update("category", v)} />
            <Field label="Ville principale" value={draft.city} onChange={v => update("city", v)} />
          </div>
        </div>

        <div className="mt-10">
          <Button asChild size="lg" className="h-14 w-full text-base bg-white text-black hover:bg-white/90 rounded-2xl font-medium">
            <Link to={`/invitation/${token}/activate`}>
              Continuer vers l'activation <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-widest text-white/50">{label}</span>
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 bg-white/[0.04] border-white/10 text-white placeholder:text-white/30 h-12 rounded-xl"
      />
    </label>
  );
}

function SaveIndicator({ state }: { state: "idle" | "saving" | "saved" }) {
  if (state === "saving") return <span className="text-xs text-white/50 inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Sauvegarde…</span>;
  if (state === "saved") return <span className="text-xs text-emerald-300 inline-flex items-center gap-1"><Check className="h-3 w-3" /> Enregistré</span>;
  return null;
}
