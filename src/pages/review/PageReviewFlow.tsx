/**
 * Public review flow — homeowner side, mobile-first
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Sparkles, Loader2, ArrowRight, ArrowLeft, Check, ExternalLink } from "lucide-react";
import { STANDOUT_LABELS, type StandoutTag } from "@/features/reviewIntelligence/types";
import { toast } from "sonner";

interface ResolvedRequest {
  id: string;
  homeowner_name: string;
  project_type: string | null;
  city: string | null;
  contractor: {
    id: string;
    business_name: string;
    logo_url: string | null;
    google_place_id?: string | null;
  };
}

export default function PageReviewFlow() {
  const { token } = useParams<{ token: string }>();
  const [request, setRequest] = useState<ResolvedRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [rating, setRating] = useState(0);
  const [work, setWork] = useState("");
  const [tags, setTags] = useState<StandoutTag[]>([]);
  const [experience, setExperience] = useState("");
  const [draft, setDraft] = useState("");
  const [approved, setApproved] = useState("");
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reviewId, setReviewId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("review-token-resolve", { body: { token } });
        if (error) throw error;
        setRequest(data);
        setWork(data.project_type ?? "");
      } catch (e: any) {
        toast.error("Lien invalide ou expiré");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const toggleTag = (t: StandoutTag) => {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const generateDraft = async () => {
    if (!request) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("review-generate-draft", {
        body: {
          token,
          rating,
          work,
          tags,
          experience,
          contractor_name: request.contractor.business_name,
          city: request.city,
        },
      });
      if (error) throw error;
      setDraft(data.text);
      setApproved(data.text);
      setStep(5);
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur de génération");
    } finally {
      setGenerating(false);
    }
  };

  const rewrite = async (mode: "shorter" | "longer") => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("review-generate-draft", {
        body: { token, rating, work, tags, experience, mode, previous: approved, contractor_name: request?.contractor.business_name, city: request?.city },
      });
      if (error) throw error;
      setDraft(data.text);
      setApproved(data.text);
    } finally {
      setGenerating(false);
    }
  };

  const submit = async () => {
    if (!request) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("review-submit", {
        body: {
          token,
          rating,
          standout_tags: tags,
          raw_text: experience,
          ai_generated_text: draft,
          approved_text: approved,
          project_type: work,
        },
      });
      if (error) throw error;
      setReviewId(data.review_id);
      setStep(6);
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur lors de la soumission");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050816] text-white">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050816] text-white p-6 text-center">
        <div>
          <p className="text-lg mb-2">Ce lien est invalide ou a expiré.</p>
          <p className="text-white/60 text-sm">Contactez l'entrepreneur pour recevoir un nouveau lien.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="alex-immersive min-h-screen bg-[#050816] text-white relative">
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/5">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-cyan-400"
          initial={{ width: 0 }}
          animate={{ width: `${(step / 6) * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      <div className="max-w-lg mx-auto px-5 pt-10 pb-16">
        <div className="text-center mb-8">
          <div className="text-xs uppercase tracking-widest text-primary mb-2">Merci {request.homeowner_name.split(" ")[0]}</div>
          <h1 className="text-2xl font-bold">{request.contractor.business_name}</h1>
          {request.project_type && <p className="text-sm text-white/50 mt-1">{request.project_type}{request.city ? ` · ${request.city}` : ""}</p>}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="1" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              <p className="text-center text-lg mb-6">Comment évaluez-vous votre expérience ?</p>
              <div className="flex justify-center gap-3 mb-8">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRating(n)}
                    className="p-2 transition-transform active:scale-95"
                  >
                    <Star
                      className={`h-12 w-12 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-white/20"}`}
                    />
                  </button>
                ))}
              </div>
              <Button className="w-full rounded-full h-12" onClick={() => setStep(2)} disabled={rating === 0}>
                Continuer <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="2" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              <p className="text-center text-lg mb-4">Quel travail a été réalisé ?</p>
              <Textarea value={work} onChange={(e) => setWork(e.target.value)} className="mb-6 min-h-24 bg-white/5 border-white/10 text-white" placeholder="Ex : Isolation grenier R-51..." />
              <div className="flex gap-2">
                <Button variant="ghost" className="rounded-full" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4" /></Button>
                <Button className="flex-1 rounded-full h-12" onClick={() => setStep(3)} disabled={!work.trim()}>
                  Continuer <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              <p className="text-center text-lg mb-6">Qu'est-ce qui a marqué ?</p>
              <div className="grid grid-cols-2 gap-2 mb-6">
                {(Object.keys(STANDOUT_LABELS) as StandoutTag[]).map((k) => {
                  const active = tags.includes(k);
                  const meta = STANDOUT_LABELS[k];
                  return (
                    <button
                      key={k}
                      onClick={() => toggleTag(k)}
                      className={`p-3 rounded-2xl border transition-all text-left ${active ? "border-primary bg-primary/15 text-white" : "border-white/10 bg-white/5 text-white/70"}`}
                    >
                      <div className="text-lg mb-1">{meta.emoji}</div>
                      <div className="text-sm font-medium">{meta.fr}</div>
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" className="rounded-full" onClick={() => setStep(2)}><ArrowLeft className="h-4 w-4" /></Button>
                <Button className="flex-1 rounded-full h-12" onClick={() => setStep(4)} disabled={tags.length === 0}>
                  Continuer <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              <p className="text-center text-lg mb-2">Racontez votre expérience</p>
              <p className="text-center text-sm text-white/50 mb-4">Quelques phrases suffisent. L'IA fera le reste.</p>
              <Textarea
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                className="mb-6 min-h-32 bg-white/5 border-white/10 text-white"
                placeholder="Ex : L'équipe est arrivée à l'heure, très propre, Jean a bien expliqué chaque étape..."
              />
              <div className="flex gap-2">
                <Button variant="ghost" className="rounded-full" onClick={() => setStep(3)}><ArrowLeft className="h-4 w-4" /></Button>
                <Button className="flex-1 rounded-full h-12" onClick={generateDraft} disabled={generating || !experience.trim()}>
                  {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Générer avec l'IA
                </Button>
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div key="5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-sm text-primary uppercase tracking-widest">Brouillon IA</p>
              </div>
              <Textarea
                value={approved}
                onChange={(e) => setApproved(e.target.value)}
                className="mb-4 min-h-48 bg-white/5 border-white/10 text-white text-base leading-relaxed"
              />
              <div className="grid grid-cols-2 gap-2 mb-4">
                <Button variant="outline" className="rounded-full" onClick={() => rewrite("shorter")} disabled={generating}>Plus court</Button>
                <Button variant="outline" className="rounded-full" onClick={() => rewrite("longer")} disabled={generating}>Plus long</Button>
              </div>
              <Button className="w-full rounded-full h-12" onClick={submit} disabled={submitting || !approved.trim()}>
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                Approuver et publier
              </Button>
            </motion.div>
          )}

          {step === 6 && (
            <motion.div key="6" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <div className="h-16 w-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Merci !</h2>
              <p className="text-white/60 mb-6">Votre avis a été enregistré. Publiez-le maintenant sur Google pour aider {request.contractor.business_name}.</p>

              <div className="glass-strong rounded-2xl p-5 mb-4 border border-white/10 text-left">
                <p className="text-sm text-white/80 leading-relaxed">{approved}</p>
              </div>

              <Button
                className="w-full rounded-full h-12 mb-3"
                onClick={async () => {
                  await navigator.clipboard.writeText(approved);
                  toast.success("Copié dans le presse-papiers");
                  if (reviewId) {
                    await supabase.functions.invoke("review-submit", {
                      body: { action: "google_click", review_id: reviewId },
                    }).catch(() => {});
                  }
                  const url = request.contractor.google_place_id
                    ? `https://search.google.com/local/writereview?placeid=${request.contractor.google_place_id}`
                    : `https://www.google.com/search?q=${encodeURIComponent(request.contractor.business_name + " " + (request.city ?? ""))}`;
                  window.open(url, "_blank");
                }}
              >
                Publier sur Google <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
              <p className="text-xs text-white/40">Le texte a été copié. Collez-le sur Google.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
