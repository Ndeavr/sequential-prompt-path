import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Search, TrendingUp, ShieldCheck } from "lucide-react";
import { Helmet } from "react-helmet-async";

export default function PageScanIALanding() {
  return (
    <div className="alex-immersive min-h-screen bg-[#050816] text-readable">
      <Helmet>
        <title>L'IA recommande-t-elle votre entreprise ? — Scan IA UNPRO</title>
        <meta
          name="description"
          content="Des milliers de propriétaires demandent à ChatGPT, Gemini et Alexa quels entrepreneurs choisir. Faites votre Scan IA gratuit en 3 secondes."
        />
      </Helmet>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-24 pb-16 md:pt-32 md:pb-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(56,189,248,0.10),transparent_60%),radial-gradient(circle_at_80%_90%,rgba(59,130,246,0.08),transparent_60%)]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-white/70 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            Nouvelle génération de recommandations
          </div>
          <h1 className="mb-6 text-4xl font-semibold tracking-tight text-white md:text-6xl">
            L'IA recommande-t-elle
            <br />
            <span className="bg-gradient-to-r from-sky-300 to-blue-500 bg-clip-text text-transparent">
              votre entreprise ?
            </span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-white/70">
            Des milliers de propriétaires demandent déjà à ChatGPT, Gemini et Alexa quels
            entrepreneurs choisir. Êtes-vous visible ?
          </p>
          <Link
            to="/scan-ia/scan"
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-semibold text-[#050816] shadow-2xl shadow-sky-500/20 transition hover:-translate-y-0.5"
          >
            Voir mon score
            <ArrowRight className="h-5 w-5" />
          </Link>
          <div className="mt-4 text-xs text-white/50">Gratuit — Résultat en 3 à 5 secondes</div>
        </div>
      </section>

      {/* Feature strip */}
      <section className="px-6 pb-24">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { icon: Search, title: "Analyse en temps réel", body: "Site, profil Google et présence IA." },
            { icon: TrendingUp, title: "Opportunités marché", body: "Demandes en attente dans votre secteur." },
            { icon: ShieldCheck, title: "Menaces détectées", body: "Concurrents visibles avant vous." },
          ].map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur"
            >
              <Icon className="mb-4 h-6 w-6 text-sky-300" />
              <div className="mb-1 text-base font-medium text-white">{title}</div>
              <div className="text-sm text-white/60">{body}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
