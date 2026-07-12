/**
 * PageDiagnostic — Homeowner multimodal diagnostic canvas.
 *
 * Public route `/diagnostic`. Homeowner uploads up to 6 photos + describes
 * the problem. Alex (Gemini 2.5 Flash via Lovable AI) returns a structured
 * diagnostic: risk score, cost range, likely causes, next actions,
 * recommended contractors. Saved to Passeport Maison for authenticated
 * users (visual_analyses + property_memory_events); guests get a session id.
 *
 * Mobile-first. No coming-soon.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PageShell from "@/layouts/PageShell";
import { Camera, ImagePlus, Loader2, ShieldCheck, TrendingUp, X, AlertTriangle, Wrench } from "lucide-react";

interface DiagnosticResult {
  summary: string;
  risk_score: number;
  urgency: "low" | "medium" | "high" | "critical";
  cost_range_cad: { min: number; max: number; confidence: "low" | "medium" | "high" };
  likely_causes: string[];
  next_actions: string[];
  findings: { label: string; severity: "low" | "medium" | "high" | "critical" }[];
  recommended_category: string;
  recommended_action: string;
  analysis_id?: string;
  recommended_contractors: Array<{
    id: string; slug: string | null; name: string; city: string | null; rating: number | null;
  }>;
}

const MAX_PHOTOS = 6;
const MAX_FILE_MB = 12;

function fileToBase64(file: File): Promise<{ base64: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result || "");
      const comma = s.indexOf(",");
      resolve({ base64: comma >= 0 ? s.slice(comma + 1) : s, mime: file.type || "image/jpeg" });
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

const urgencyStyle: Record<DiagnosticResult["urgency"], { bg: string; text: string; label: string }> = {
  low: { bg: "bg-emerald-500/15 border-emerald-500/40", text: "text-emerald-300", label: "Faible" },
  medium: { bg: "bg-amber-500/15 border-amber-500/40", text: "text-amber-300", label: "Modérée" },
  high: { bg: "bg-orange-500/20 border-orange-500/50", text: "text-orange-300", label: "Élevée" },
  critical: { bg: "bg-red-500/20 border-red-500/60", text: "text-red-300", label: "Critique" },
};

function formatCAD(n: number): string {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);
}

export default function PageDiagnostic() {
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const sessionIdRef = useRef<string>("");

  useEffect(() => {
    document.title = "Diagnostic maison — Alex analyse tes photos • UNPRO";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Envoie une photo, décris ton problème. Alex identifie la cause, estime le coût et recommande le bon pro au Québec.");
    if (!sessionIdRef.current) {
      try {
        sessionIdRef.current = (crypto as any).randomUUID?.() ?? String(Date.now());
      } catch { sessionIdRef.current = String(Date.now()); }
    }
  }, []);

  useEffect(() => {
    const urls = photos.map((p) => URL.createObjectURL(p));
    setPreviews(urls);
    return () => { urls.forEach((u) => URL.revokeObjectURL(u)); };
  }, [photos]);

  const addFiles = useCallback((files: FileList | File[] | null) => {
    if (!files) return;
    const incoming = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const filtered = incoming.filter((f) => f.size <= MAX_FILE_MB * 1024 * 1024);
    if (incoming.length !== filtered.length) {
      setError(`Certaines photos dépassent ${MAX_FILE_MB} Mo et ont été ignorées.`);
    }
    setPhotos((prev) => [...prev, ...filtered].slice(0, MAX_PHOTOS));
  }, []);

  const removePhoto = (i: number) => setPhotos((prev) => prev.filter((_, k) => k !== i));

  const canSubmit = (photos.length > 0 || description.trim().length >= 5) && !loading;

  const submit = async () => {
    if (!canSubmit) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const images = await Promise.all(photos.map(fileToBase64));
      const { data, error: fnErr } = await supabase.functions.invoke("diagnostic-analyze", {
        body: {
          images,
          description: description.trim() || undefined,
          city: city.trim() || undefined,
          session_id: sessionIdRef.current,
        },
      });
      if (fnErr) throw new Error(fnErr.message || "diagnostic_failed");
      if ((data as any)?.error) {
        const code = (data as any).error;
        if (code === "rate_limited") throw new Error("Trop de demandes. Réessaie dans une minute.");
        if (code === "credits_exhausted") throw new Error("Le quota d'analyse est atteint. Réessaie plus tard.");
        if (code === "need_input") throw new Error("Ajoute au moins une photo ou une description.");
        throw new Error("Analyse impossible pour l'instant.");
      }
      setResult(data as DiagnosticResult);
      // Scroll to result
      setTimeout(() => document.getElementById("diag-result")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (e: any) {
      setError(e?.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setResult(null); setPhotos([]); setDescription(""); setError(null); };

  const urgency = result ? urgencyStyle[result.urgency] : null;
  const costLabel = useMemo(() => {
    if (!result) return "";
    const { min, max } = result.cost_range_cad;
    if (min === 0 && max === 0) return "Aucun coût prévu";
    if (min === max) return formatCAD(max);
    return `${formatCAD(min)} – ${formatCAD(max)}`;
  }, [result]);

  return (
    <PageShell variant="app" id="diagnostic" className="bg-[#050816] text-white min-h-[100svh]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 pb-8">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50 mb-2">Diagnostic maison</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-[1.05]">
            Envoie une photo.<br />Alex te dit quoi faire.
          </h1>
          <p className="text-white/70 mt-3 text-[15px] leading-relaxed">
            Cause probable, niveau de risque, fourchette de coût, prochaines étapes — en 30 secondes.
          </p>
        </header>

        {!result && (
          <section className="space-y-5">
            {/* Photo upload */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-4">
              <label className="text-sm font-semibold text-white/90 mb-3 block">
                Photos ({photos.length}/{MAX_PHOTOS})
              </label>
              {previews.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {previews.map((src, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-white/10">
                      <img src={src} alt={`photo ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        aria-label="Retirer la photo"
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 backdrop-blur flex items-center justify-center hover:bg-black"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={photos.length >= MAX_PHOTOS}
                  className="h-14 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition flex items-center justify-center gap-2 text-sm font-semibold disabled:opacity-40"
                >
                  <ImagePlus className="w-4 h-4" /> Galerie
                </button>
                <button
                  type="button"
                  onClick={() => { if (fileRef.current) { fileRef.current.setAttribute("capture", "environment"); fileRef.current.click(); } }}
                  disabled={photos.length >= MAX_PHOTOS}
                  className="h-14 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition flex items-center justify-center gap-2 text-sm font-semibold disabled:opacity-40"
                >
                  <Camera className="w-4 h-4" /> Caméra
                </button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => { addFiles(e.target.files); if (fileRef.current) fileRef.current.value = ""; }}
              />
            </div>

            {/* Description */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-4">
              <label htmlFor="diag-desc" className="text-sm font-semibold text-white/90 mb-2 block">
                Décris le problème
              </label>
              <textarea
                id="diag-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="Ex : Tache d'eau au plafond de la cuisine, apparue après la pluie de la semaine passée."
                className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-[15px] leading-relaxed placeholder:text-white/30 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/20"
              />
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ville (facultatif)"
                className="mt-2 w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-[15px] placeholder:text-white/30 focus:outline-none focus:border-blue-400/50"
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200 flex gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
              </div>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              data-cta-canonical="diagnostic-submit"
              className="w-full h-16 rounded-2xl bg-gradient-to-b from-blue-500 to-blue-600 text-white font-bold text-[17px] shadow-lg shadow-blue-500/30 hover:from-blue-400 hover:to-blue-500 active:scale-[0.99] transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Alex analyse tes photos…</>
              ) : (
                <>Lancer le diagnostic</>
              )}
            </button>

            <ul className="text-[13px] text-white/50 space-y-1 pt-1">
              <li className="flex gap-2"><ShieldCheck className="w-3.5 h-3.5 mt-0.5" /> Analyse gratuite. Aucune inscription requise.</li>
              <li className="flex gap-2"><TrendingUp className="w-3.5 h-3.5 mt-0.5" /> Résultat sauvegardé à ton Passeport Maison si tu te connectes.</li>
            </ul>
          </section>
        )}

        {result && urgency && (
          <section id="diag-result" className="space-y-4">
            {/* Risk header */}
            <div className={`rounded-3xl border ${urgency.bg} p-5`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs uppercase tracking-[0.2em] font-bold ${urgency.text}`}>
                  Urgence · {urgency.label}
                </span>
                <span className="text-4xl font-black tabular-nums">{result.risk_score}<span className="text-lg opacity-60">/100</span></span>
              </div>
              <p className="text-[15px] leading-relaxed text-white/90">{result.summary}</p>
            </div>

            {/* Cost */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs uppercase tracking-wider text-white/50 mb-1">Fourchette de coût estimée</p>
              <p className="text-2xl font-bold">{costLabel}</p>
              <p className="text-xs text-white/50 mt-1">Confiance : {result.cost_range_cad.confidence}</p>
            </div>

            {/* Causes */}
            {result.likely_causes.length > 0 && (
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <h2 className="text-sm font-semibold text-white/90 mb-3">Causes probables</h2>
                <ul className="space-y-2">
                  {result.likely_causes.map((c, i) => (
                    <li key={i} className="flex gap-2 text-[15px] text-white/85">
                      <span className="text-blue-300 font-bold">{i + 1}.</span> {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Next actions */}
            {result.next_actions.length > 0 && (
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <h2 className="text-sm font-semibold text-white/90 mb-3">Prochaines étapes</h2>
                <ol className="space-y-2">
                  {result.next_actions.map((a, i) => (
                    <li key={i} className="flex gap-2 text-[15px] text-white/85">
                      <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      {a}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Contractors */}
            {result.recommended_contractors?.length > 0 && (
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <h2 className="text-sm font-semibold text-white/90 mb-3 flex items-center gap-2">
                  <Wrench className="w-4 h-4" /> Entrepreneurs recommandés
                </h2>
                <ul className="space-y-2">
                  {result.recommended_contractors.map((c) => (
                    <li key={c.id}>
                      <Link
                        to={c.slug ? `/pro/${c.slug}` : "#"}
                        className="flex items-center justify-between rounded-2xl bg-white/[0.04] border border-white/10 px-4 py-3 hover:bg-white/[0.08] active:scale-[0.99] transition"
                      >
                        <div>
                          <p className="font-semibold text-[15px]">{c.name}</p>
                          {c.city && <p className="text-xs text-white/50">{c.city}</p>}
                        </div>
                        {c.rating != null && (
                          <span className="text-sm font-bold text-amber-300">★ {c.rating.toFixed(1)}</span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* CTA */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={reset}
                className="h-14 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 font-semibold text-sm"
              >
                Nouveau diagnostic
              </button>
              <Link
                to="/signup?from=diagnostic"
                data-cta-canonical="save-passeport"
                className="h-14 rounded-2xl bg-white text-black font-bold text-sm flex items-center justify-center hover:bg-white/90 active:scale-[0.99]"
              >
                Sauver au Passeport
              </Link>
            </div>
          </section>
        )}
      </div>
    </PageShell>
  );
}
