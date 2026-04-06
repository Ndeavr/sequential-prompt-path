import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Briefcase, Code2, ArrowRight, Sparkles } from "lucide-react";

const jobs = [
  {
    slug: "representant",
    title: "Représentant terrain",
    subtitle: "Rencontre des entrepreneurs. Crée leur profil IA. Encaisse des commissions récurrentes.",
    icon: Briefcase,
    tags: ["Étudiants bienvenus", "Temps partiel OK", "Commissions récurrentes"],
  },
  {
    slug: "programmeur",
    title: "Programmeur full-stack IA",
    subtitle: "Construis quelque chose de massif avec nous. React, TypeScript, Supabase, IA.",
    icon: Code2,
    tags: ["React / TypeScript", "Supabase / PostgreSQL", "IA / LLM"],
  },
];

export default function PageCareers() {
  return (
    <>
      <Helmet>
        <title>Carrières UNPRO — Rejoins une startup ambitieuse</title>
        <meta name="description" content="UNPRO recrute des builders. Représentants terrain et programmeurs full-stack IA. Rejoins une plateforme SaaS premium qui redéfinit les services résidentiels." />
        <link rel="canonical" href="https://sequential-prompt-path.lovable.app/carrieres" />
      </Helmet>

      <section className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-20 relative overflow-hidden">
        {/* BG orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/15 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/3 right-1/4 w-72 h-72 rounded-full bg-secondary/10 blur-[100px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 text-center max-w-2xl mx-auto mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            On recrute des builders
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold text-foreground leading-tight mb-4">
            Carrières
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            UNPRO n'est pas un petit projet. On construit une plateforme qui veut redéfinir comment les gens trouvent, évaluent et réservent les bons professionnels.
          </p>
        </motion.div>

        <div className="relative z-10 w-full max-w-2xl mx-auto space-y-4">
          {jobs.map((job, i) => (
            <motion.div
              key={job.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.12 }}
            >
              <Link
                to={`/carrieres/${job.slug}`}
                className="group block p-6 rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm hover:border-primary/30 hover:bg-card/80 transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                    <job.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                        {job.title}
                      </h2>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{job.subtitle}</p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {job.tags.map((tag) => (
                        <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/40">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    </>
  );
}
