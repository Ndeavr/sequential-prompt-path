import { useRef, useCallback, useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Code2, Sparkles, Zap, Database, Brain, Rocket, Send, Loader2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const stackCategories = [
  {
    title: "Frontend",
    items: ["React", "Vite", "TypeScript", "Tailwind CSS", "Framer Motion", "shadcn/ui", "Lucide Icons"],
  },
  {
    title: "Backend / Data",
    items: ["Supabase", "PostgreSQL", "Auth / RLS", "Edge Functions", "Realtime", "Storage"],
  },
  {
    title: "IA / Intelligence",
    items: ["OpenAI", "Gemini", "Agents IA", "Matching prédictif", "Scoring intelligent"],
  },
  {
    title: "SEO / AEO / GEO",
    items: ["JSON-LD", "Schema.org", "Sitemaps dynamiques", "Pages programmatiques", "Content clustering"],
  },
  {
    title: "Paiement / APIs",
    items: ["Stripe", "Resend", "Google Calendar API", "OAuth", "Webhooks"],
  },
];

const whatYouBuild = [
  { icon: Brain, text: "Onboarding intelligent & scoring AIPP" },
  { icon: Database, text: "Dashboards multi-rôles (propriétaires, entrepreneurs, condos, admin)" },
  { icon: Zap, text: "Moteur de matching prédictif & réservation exclusive" },
  { icon: Sparkles, text: "Concierge IA conversationnel (Alex)" },
  { icon: Rocket, text: "Passeport Maison / Condo & knowledge graph immobilier" },
  { icon: Code2, text: "SEO programmatique 30 000+ pages, AEO/GEO" },
];

export default function PageRecruitmentProgrammer() {
  const formRef = useRef<HTMLDivElement>(null);
  const scrollToForm = useCallback(() => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <>
      <Helmet>
        <title>Programmeur Full-Stack IA — Carrières UNPRO</title>
        <meta name="description" content="UNPRO recrute un programmeur full-stack IA pour bâtir une plateforme SaaS premium. React, TypeScript, Supabase, PostgreSQL, Stripe, IA. Builder recherché." />
        <link rel="canonical" href="https://sequential-prompt-path.lovable.app/carrieres/programmeur" />
      </Helmet>

      {/* Hero */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden px-4 py-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-secondary/15 blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-8">
          <Link to="/carrieres" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-4">
            <ArrowLeft className="w-3.5 h-3.5" /> Toutes les offres
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-6">
              <Code2 className="w-3.5 h-3.5" />
              Poste ouvert
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-foreground leading-tight">
              Programmeur full-stack IA
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mt-4 leading-relaxed">
              Construis quelque chose de massif avec nous.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button size="lg" onClick={scrollToForm} className="text-base px-8 py-6 font-semibold">
              <Send className="w-4 h-4 mr-2" /> Envoyer ma candidature
            </Button>
          </motion.div>
        </div>
      </section>

      {/* What is UNPRO */}
      <section className="px-4 py-16 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-foreground mb-6">UNPRO n'est pas un petit projet.</h2>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>On construit une plateforme qui veut redéfinir comment les gens trouvent, évaluent, comprennent et réservent les bons professionnels pour leur propriété.</p>
          <p>On ne bâtit pas un site vitrine. On bâtit une infrastructure.</p>
          <p className="text-foreground font-medium">UNPRO mélange : SaaS premium, IA conversationnelle, scoring intelligent, matching prédictif, proptech, marketplace nouvelle génération, knowledge graph, automatisation, SEO programmatique / AEO / GEO.</p>
        </div>
      </section>

      {/* What you build */}
      <section className="px-4 py-16 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-foreground mb-8">Ce que tu vas construire</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {whatYouBuild.map((item) => (
            <div key={item.text} className="flex items-start gap-3 p-4 rounded-xl border border-border/40 bg-card/40">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <item.icon className="w-4.5 h-4.5 text-primary" />
              </div>
              <span className="text-sm text-foreground">{item.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Stack */}
      <section className="px-4 py-16 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-foreground mb-8">Stack technologique</h2>
        <div className="space-y-6">
          {stackCategories.map((cat) => (
            <div key={cat.title}>
              <h3 className="text-sm font-semibold text-foreground mb-2">{cat.title}</h3>
              <div className="flex flex-wrap gap-1.5">
                {cat.items.map((item) => (
                  <span key={item} className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border/40">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Profile */}
      <section className="px-4 py-16 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-foreground mb-6">Le profil qu'on cherche</h2>
        <ul className="space-y-2 text-muted-foreground text-sm">
          {[
            "Tu codes vite, mais pas sale",
            "Tu comprends la logique produit derrière le code",
            "Tu sais structurer une base de données propre",
            "Tu es à l'aise dans une startup qui avance vite",
            "Tu peux prendre un module flou et le transformer en build clair",
            "Tu n'as pas besoin qu'on te tienne par la main",
            "Tu aimes les systèmes intelligents et les UX premium",
            "Tu veux construire quelque chose qui peut devenir énorme",
          ].map((t) => (
            <li key={t} className="flex items-start gap-2">
              <span className="text-primary mt-0.5">→</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-foreground font-medium text-sm">On cherche un builder, pas un simple exécutant.</p>
      </section>

      {/* Why join */}
      <section className="px-4 py-16 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-foreground mb-6">Pourquoi nous rejoindre</h2>
        <ul className="space-y-2 text-muted-foreground text-sm">
          {[
            "Projet très ambitieux",
            "Latitude de construction",
            "Impact direct sur le produit",
            "Rôle clé dans l'évolution de la plateforme",
            "Environnement orienté exécution",
            "Possibilité de croissance importante",
            "Rémunération selon niveau, autonomie et impact",
          ].map((t) => (
            <li key={t} className="flex items-start gap-2">
              <span className="text-primary mt-0.5">✦</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Form */}
      <div ref={formRef}>
        <ProgrammerApplicationForm />
      </div>

      <div className="h-20 md:hidden" />
    </>
  );
}

function ProgrammerApplicationForm() {
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [github, setGithub] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [stack, setStack] = useState("");
  const [motivation, setMotivation] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Nom et courriel requis");
      return;
    }
    setSubmitting(true);
    try {
      await (supabase.from("recruitment_leads" as any) as any).insert([{
        name: name.trim(),
        email: email.trim(),
        phone: "",
        city: "",
        experience_level: "developer",
        availability: "permanent",
        work_mode: "remote",
        motivation: `[PROGRAMMEUR]\nGitHub: ${github}\nLinkedIn: ${linkedin}\nStack: ${stack}\n\n${motivation}`,
        source_page: "/carrieres/programmeur",
      }]);
      toast.success("Candidature envoyée!");
      setName(""); setEmail(""); setGithub(""); setLinkedin(""); setStack(""); setMotivation("");
    } catch {
      toast.error("Erreur, réessaie.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="px-4 py-16 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-foreground mb-2">Envoyer ma candidature</h2>
      <p className="text-sm text-muted-foreground mb-8">Vers jobs@unpro.ca</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label>Nom complet *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ton nom" required />
        </div>
        <div>
          <Label>Courriel *</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ton@email.com" required />
        </div>
        <div>
          <Label>GitHub ou portfolio</Label>
          <Input value={github} onChange={(e) => setGithub(e.target.value)} placeholder="https://github.com/..." />
        </div>
        <div>
          <Label>LinkedIn</Label>
          <Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..." />
        </div>
        <div>
          <Label>Stack maîtrisé</Label>
          <Input value={stack} onChange={(e) => setStack(e.target.value)} placeholder="React, TypeScript, Supabase, PostgreSQL..." />
        </div>
        <div>
          <Label>Pourquoi UNPRO? (optionnel)</Label>
          <Textarea value={motivation} onChange={(e) => setMotivation(e.target.value)} placeholder="Pourquoi tu serais bon pour construire UNPRO?" rows={4} />
        </div>
        <Button type="submit" size="lg" className="w-full font-semibold" disabled={submitting}>
          {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
          Envoyer ma candidature
        </Button>
      </form>
    </section>
  );
}
