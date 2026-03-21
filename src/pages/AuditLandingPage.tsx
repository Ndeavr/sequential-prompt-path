import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Shield, Target, Zap, TrendingDown, CheckCircle, ChevronDown, ChevronUp, Star, MapPin, DollarSign } from "lucide-react";

const SCORE_LABELS: Record<string, { label: string; icon: any; max: number }> = {
  seo_score: { label: "SEO", icon: Target, max: 15 },
  reviews_score: { label: "Avis", icon: Star, max: 10 },
  content_score: { label: "Contenu", icon: Zap, max: 10 },
  ai_score: { label: "IA", icon: Zap, max: 15 },
  branding_score: { label: "Marque", icon: Shield, max: 10 },
  trust_score: { label: "Confiance", icon: Shield, max: 10 },
  local_score: { label: "Local", icon: MapPin, max: 15 },
  conversion_score: { label: "Conversion", icon: DollarSign, max: 15 },
};

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 70 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
  const pct = Math.min(100, score);
  const r = 80;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ * 0.75;

  return (
    <div className="relative w-48 h-48 mx-auto">
      <svg viewBox="0 0 200 200" className="w-full h-full -rotate-[135deg]">
        <circle cx="100" cy="100" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="12" strokeDasharray={`${circ * 0.75} ${circ * 0.25}`} strokeLinecap="round" />
        <motion.circle
          cx="100" cy="100" r={r} fill="none" stroke={color} strokeWidth="12"
          strokeDasharray={`${circ * 0.75} ${circ * 0.25}`} strokeLinecap="round"
          initial={{ strokeDashoffset: circ * 0.75 }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span className="text-5xl font-bold" style={{ color }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          {score}
        </motion.span>
        <span className="text-xs text-muted-foreground mt-1">/ 100</span>
      </div>
    </div>
  );
}

const AuditLandingPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const { data: prospect, isLoading } = useQuery({
    queryKey: ["audit-landing", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractors_prospects")
        .select("*")
        .eq("landing_slug", slug)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) { toast.error("Nom et téléphone requis"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("prospect_bookings").insert({
      contractor_id: prospect?.id,
      name: form.name,
      email: form.email,
      phone: form.phone,
      company: form.company || prospect?.business_name,
      notes: form.message,
      category: prospect?.category,
      city: prospect?.city,
      source: "audit_landing",
    });
    setSubmitting(false);
    if (error) { toast.error("Erreur lors de l'envoi"); return; }
    toast.success("Demande envoyée avec succès !");
    setForm({ name: "", email: "", phone: "", company: "", message: "" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement de votre analyse...</div>
      </div>
    );
  }

  if (!prospect) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-bold mb-2">Analyse non trouvée</h1>
        <p className="text-muted-foreground mb-4">Cette page d'audit n'est pas disponible.</p>
        <Button asChild><a href="/">Visiter UnPRO</a></Button>
      </div>
    );
  }

  const p = prospect;
  const diag = (p.diagnostic as any[]) ?? [];
  const wins = (p.quick_wins as any[]) ?? [];
  const gaps = (p.competitor_gap as string[]) ?? [];

  const faqs = [
    { q: "Qu'est-ce que le score AIPP ?", a: "Le score AIPP (AI-Indexed Professional Profile) mesure la visibilité, la crédibilité et la capacité de conversion de votre présence numérique dans le contexte de la recherche locale et des moteurs IA." },
    { q: "Est-ce un audit gratuit ?", a: "Oui, cette analyse est entièrement gratuite et sans engagement. Elle vous donne une vue claire de votre positionnement numérique actuel." },
    { q: "Quelle est la différence avec les leads partagés ?", a: "UnPRO ne vend pas des leads partagés entre plusieurs entrepreneurs. Nous aidons chaque entrepreneur à capter et convertir ses propres clients qualifiés." },
    { q: "Est-ce que vous faites du SEO / IA / Google ?", a: "UnPRO combine SEO local, optimisation IA, profils structurés et système de rendez-vous qualifiés pour créer une présence dominante dans votre marché." },
    { q: "Comment savoir si ma catégorie est encore disponible ?", a: "Le nombre d'entrepreneurs accompagnés est limité par catégorie et territoire. Soumettez votre demande et nous vous confirmerons rapidement." },
  ];

  const bandLabel =
    (p.aipp_score ?? 0) < 40 ? "Fragile" :
    (p.aipp_score ?? 0) < 55 ? "Présent mais vulnérable" :
    (p.aipp_score ?? 0) < 70 ? "Bon potentiel, sous-optimisé" :
    (p.aipp_score ?? 0) < 85 ? "Fort, perfectible" : "Dominant";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="relative max-w-3xl mx-auto px-4 py-16 sm:py-24 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Badge className="mb-4 bg-primary/20 text-primary border-primary/30">Analyse IA 2026</Badge>
            <h1 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">
              {p.business_name}, voici ce que votre présence numérique dit vraiment
            </h1>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              Nous avons analysé votre visibilité locale, votre lisibilité IA, vos signaux de confiance et votre capacité à convertir la demande.
            </p>
          </motion.div>

          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3, duration: 0.6 }}>
            <ScoreGauge score={p.aipp_score ?? 0} />
            <p className="mt-2 text-sm text-muted-foreground">{bandLabel}</p>
          </motion.div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <Button size="lg" onClick={() => document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" })}>
              Réserver un appel stratégique <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Score breakdown */}
      <section className="max-w-3xl mx-auto px-4 py-12">
        <h2 className="text-xl font-bold mb-6 text-center">Détail de votre score</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(SCORE_LABELS).map(([key, { label, max }]) => {
            const val = (p as any)[key] ?? 0;
            const pct = Math.round((val / max) * 100);
            const color = pct >= 70 ? "text-green-400" : pct >= 40 ? "text-amber-400" : "text-red-400";
            return (
              <Card key={key} className="bg-card/60">
                <CardContent className="p-4 text-center">
                  <p className={`text-2xl font-bold ${color}`}>{val}<span className="text-sm text-muted-foreground">/{max}</span></p>
                  <p className="text-xs text-muted-foreground mt-1">{label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Diagnostic */}
      {diag.length > 0 && (
        <section className="max-w-3xl mx-auto px-4 py-8">
          <h2 className="text-xl font-bold mb-4">Diagnostic</h2>
          <div className="space-y-2">
            {diag.map((d: any, i: number) => (
              <div key={i} className={`p-3 rounded-lg border text-sm ${d.severity === "critical" ? "border-red-500/30 bg-red-500/10" : d.severity === "warning" ? "border-amber-500/30 bg-amber-500/10" : "border-blue-500/30 bg-blue-500/10"}`}>
                {d.message}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Revenue leak */}
      {(p.estimated_monthly_loss_min || p.estimated_monthly_loss_max) && (
        <section className="max-w-3xl mx-auto px-4 py-8">
          <Card className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/20">
            <CardContent className="p-6 text-center">
              <TrendingDown className="h-8 w-8 text-red-400 mx-auto mb-3" />
              <h2 className="text-lg font-bold mb-2">Opportunités probablement perdues chaque mois</h2>
              <p className="text-3xl font-bold text-red-400">
                {p.estimated_monthly_loss_min?.toLocaleString("fr-CA")}$ — {p.estimated_monthly_loss_max?.toLocaleString("fr-CA")}$
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                La demande existe. Le problème n'est pas l'offre, c'est la captation et la conversion.
              </p>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Quick wins */}
      {wins.length > 0 && (
        <section className="max-w-3xl mx-auto px-4 py-8">
          <h2 className="text-xl font-bold mb-4">Actions prioritaires</h2>
          <div className="grid gap-3">
            {wins.map((w: any, i: number) => (
              <Card key={i}>
                <CardContent className="p-4 flex items-start gap-3">
                  <CheckCircle className={`h-5 w-5 mt-0.5 shrink-0 ${w.impact === "high" ? "text-green-400" : "text-amber-400"}`} />
                  <div>
                    <p className="font-medium text-sm">{w.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{w.description}</p>
                  </div>
                  <Badge variant="outline" className="ml-auto shrink-0 text-xs">{w.impact === "high" ? "Impact fort" : "Impact moyen"}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Why UnPRO */}
      <section className="max-w-3xl mx-auto px-4 py-12">
        <h2 className="text-xl font-bold mb-6 text-center">Pourquoi UnPRO</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { icon: Target, title: "Profil AIPP indexé IA", desc: "Votre profil est structuré pour être découvert par les moteurs IA et la recherche locale." },
            { icon: MapPin, title: "Pages locales ciblées", desc: "Des pages optimisées captent l'intention de recherche dans votre territoire." },
            { icon: Zap, title: "Rendez-vous qualifiés", desc: "Des clients prêts à avancer, pas des leads partagés entre 5 concurrents." },
          ].map((c, i) => (
            <Card key={i}>
              <CardContent className="p-5 text-center">
                <c.icon className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold text-sm mb-1">{c.title}</h3>
                <p className="text-xs text-muted-foreground">{c.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 py-8">
        <h2 className="text-xl font-bold mb-4">Questions fréquentes</h2>
        <div className="space-y-2">
          {faqs.map((f, i) => (
            <Card key={i} className="cursor-pointer" onClick={() => setFaqOpen(faqOpen === i ? null : i)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{f.q}</span>
                  {faqOpen === i ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
                {faqOpen === i && <p className="text-sm text-muted-foreground mt-2">{f.a}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Booking form */}
      <section id="booking" className="max-w-3xl mx-auto px-4 py-12">
        <Card className="border-primary/20">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-2 text-center">Recevoir votre plan d'amélioration</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">Voyez si votre catégorie est encore ouverte à {p.city ?? "Laval"}</p>
            <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-3">
              <Input placeholder="Prénom et nom *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Input placeholder="Téléphone *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
              <Input placeholder="Courriel" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Input placeholder="Entreprise" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              <Textarea placeholder="Message (optionnel)" className="sm:col-span-2" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
              <Button type="submit" className="sm:col-span-2" size="lg" disabled={submitting}>
                {submitting ? "Envoi..." : "Envoyer ma demande"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="max-w-3xl mx-auto px-4 py-8 text-center text-sm text-muted-foreground border-t border-border/30">
        <p className="mb-2">Vous investissez peut-être déjà pour être visible.</p>
        <p className="font-semibold text-foreground">Le vrai enjeu en 2026, c'est d'être choisi.</p>
        <p className="mt-4 text-xs">© {new Date().getFullYear()} UnPRO — Analyse IA</p>
      </footer>

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 sm:hidden bg-background/95 backdrop-blur border-t border-border/50 p-3 z-50">
        <Button className="w-full" size="lg" onClick={() => document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" })}>
          Réserver un appel stratégique
        </Button>
      </div>
    </div>
  );
};

export default AuditLandingPage;
