import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SeoHead from "@/seo/components/SeoHead";
import { useFormSubmit } from "@/lib/forms/useFormSubmit";
import { FormSuccess } from "@/components/forms/FormSuccess";
import { FormErrorRetry } from "@/components/forms/FormErrorRetry";
import {
  CheckCircle2, Sparkles, Users, Cpu, Headphones, ShieldCheck,
  TrendingUp, MapPin, Infinity as InfinityIcon, Mail, Phone, Globe, AlertTriangle,
} from "lucide-react";

const MISSION = [
  "Obtenir plus de contrats",
  "Réduire les soumissions inutiles",
  "Améliorer leur visibilité IA",
  "Moderniser leur entreprise",
  "Automatiser leur acquisition client",
];

const PROFILS = [
  "Représentants terrain", "Agences marketing", "Consultants",
  "Entrepreneurs connectés", "Influenceurs locaux", "Vendeurs B2B",
  "Réseauteurs", "Partenaires construction / rénovation",
];

const VALUE = [
  "Profil IA", "Score AIPP", "Automatisation",
  "Visibilité", "Appels entrants", "Rendez-vous", "Croissance",
];

export default function PagePartenairesCertifies() {
  const [form, setForm] = useState({
    salutation: "", first_name: "", last_name: "",
    phone: "", email: "", message: "",
  });
  const update = (k: keyof typeof form, v: string) => setForm(s => ({ ...s, [k]: v }));

  const { submit, retry, error, result, isSubmitting, isSuccess, isError } = useFormSubmit({
    formType: 'partner_application',
    validate: (d) => {
      if (!d.first_name || !d.last_name || !d.phone || !d.email) return 'Veuillez remplir tous les champs requis.';
      if (!/^\S+@\S+\.\S+$/.test(String(d.email))) return 'Courriel invalide.';
      return null;
    },
  });

  const onSubmit = (e: React.FormEvent) => { e.preventDefault(); submit(form); };

  return (
    <>
      <SeoHead
        title="Programme Partenaire Certifié — UNPRO | Revenus récurrents IA"
        description="Devenez Partenaire Certifié UNPRO. 30% de commissions récurrentes pendant 24 mois + 10% résiduel à vie sur les abonnements entrepreneurs au Québec."
        canonical="https://unpro.ca/partenaires"
      />

      <main className="min-h-screen bg-[#060B14] text-foreground">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-white/5">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-amber-500/5 pointer-events-none" />
          <div className="absolute top-0 right-0 w-[40vw] h-[40vw] rounded-full bg-amber-500/5 blur-[100px] pointer-events-none" />
          <div className="relative max-w-6xl mx-auto px-5 py-20 md:py-28">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-medium mb-6">
              <Sparkles className="w-3.5 h-3.5" /> PROGRAMME PARTENAIRE CERTIFIÉ
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-5 leading-[1.05]">
              Transformez vos contacts entrepreneurs<br />
              <span className="text-amber-400">en revenus récurrents.</span>
            </h1>
            <p className="text-base md:text-lg text-white/70 max-w-2xl mb-8">
              UNPRO recherche des partenaires ambitieux partout au Québec pour aider les entrepreneurs à obtenir plus de contrats grâce à l'intelligence artificielle.
            </p>
            <Button
              size="lg"
              className="bg-amber-500 hover:bg-amber-400 text-[#060B14] font-semibold"
              onClick={() => document.getElementById("apply")?.scrollIntoView({ behavior: "smooth" })}
            >
              Devenir Partenaire Certifié
            </Button>
          </div>
        </section>

        {/* Ce que vous obtenez */}
        <section className="max-w-6xl mx-auto px-5 py-16">
          <div className="text-center mb-10">
            <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold tracking-widest text-white/80">
              CE QUE VOUS OBTENEZ
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent p-8">
              <div className="text-5xl md:text-6xl font-bold text-amber-400 mb-2">30%</div>
              <div className="text-sm font-semibold uppercase tracking-wide text-white/90 mb-3">de commissions récurrentes</div>
              <p className="text-sm text-white/60">Pendant 24 mois sur les abonnements entrepreneurs admissibles.</p>
            </div>
            <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent p-8">
              <div className="text-5xl md:text-6xl font-bold text-amber-400 mb-2">10%</div>
              <div className="text-sm font-semibold uppercase tracking-wide text-white/90 mb-3">résiduel à vie</div>
              <p className="text-sm text-white/60">Tant que les conditions du programme sont respectées.</p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-6 flex items-start gap-4">
            <InfinityIcon className="w-6 h-6 text-amber-400 shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-white mb-1">Revenus récurrents cumulés</h3>
              <p className="text-sm text-white/60">Chaque entrepreneur actif peut générer des revenus mensuels récurrents pendant des années.</p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {VALUE.map(v => (
              <span key={v} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/80">
                <CheckCircle2 className="w-3 h-3 inline mr-1.5 text-amber-400" />{v}
              </span>
            ))}
          </div>
        </section>

        {/* Mission + Profils + Fournit */}
        <section className="max-w-6xl mx-auto px-5 py-16 grid md:grid-cols-3 gap-5">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <TrendingUp className="w-6 h-6 text-amber-400 mb-3" />
            <h3 className="font-semibold text-white mb-3">Votre mission</h3>
            <p className="text-xs text-white/50 mb-3">Vous aidez les entrepreneurs à :</p>
            <ul className="space-y-2">
              {MISSION.map(m => (
                <li key={m} className="flex items-start gap-2 text-sm text-white/80">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />{m}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <Users className="w-6 h-6 text-amber-400 mb-3" />
            <h3 className="font-semibold text-white mb-3">Profils recherchés</h3>
            <ul className="space-y-2">
              {PROFILS.map(p => (
                <li key={p} className="text-sm text-white/80 flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">•</span>{p}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <Cpu className="w-6 h-6 text-amber-400 mb-3" />
            <h3 className="font-semibold text-white mb-3">Ce que UNPRO vous fournit</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-400 mb-1"><Cpu className="w-4 h-4" />Outils IA</div>
                <p className="text-xs text-white/60">Score AIPP, onboarding intelligent, import automatique du profil entreprise, pages optimisées IA, CRM et automatisations.</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-400 mb-1"><Headphones className="w-4 h-4" />Support</div>
                <p className="text-xs text-white/60">Formation, scripts, matériel marketing, tableaux de bord partenaires, support onboarding.</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-400 mb-1"><ShieldCheck className="w-4 h-4" />Crédibilité</div>
                <p className="text-xs text-white/60">Marque premium, plateforme IA, vision long terme, système exclusif Québec.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Conditions + Pourquoi */}
        <section className="max-w-6xl mx-auto px-5 py-16 grid md:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <h3 className="font-semibold text-white mb-3 uppercase text-sm tracking-wider">Conditions du programme</h3>
            <p className="text-xs text-white/50 mb-3">Pour maintenir le statut Partenaire Certifié :</p>
            <ul className="space-y-2 mb-5">
              <li className="flex items-start gap-2 text-sm text-white/80"><CheckCircle2 className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />Minimum 10 nouveaux entrepreneurs actifs par année</li>
              <li className="flex items-start gap-2 text-sm text-white/80"><CheckCircle2 className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />Comptes en règle</li>
              <li className="flex items-start gap-2 text-sm text-white/80"><CheckCircle2 className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />Respect des standards qualité UNPRO</li>
            </ul>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div className="text-xs text-white/70">
                  <p className="mb-1">Les commissions résiduelles peuvent être ajustées ou suspendues en cas :</p>
                  <ul className="list-disc list-inside space-y-0.5 text-white/60">
                    <li>D'inactivité prolongée</li>
                    <li>Fraude / spam / abus</li>
                    <li>Forte attrition des comptes référés</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent p-6">
            <h3 className="font-semibold text-white mb-3 uppercase text-sm tracking-wider">Pourquoi maintenant ?</h3>
            <p className="text-xs text-white/60 mb-3">Le marché change rapidement :</p>
            <ul className="space-y-2 mb-5">
              {[
                "L'IA transforme la recherche locale",
                "Les entrepreneurs veulent moins de compétition",
                "Les leads partagés perdent en efficacité",
                "Les entreprises cherchent des systèmes prédictifs",
              ].map(t => (
                <li key={t} className="flex items-start gap-2 text-sm text-white/80">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />{t}
                </li>
              ))}
            </ul>
            <p className="text-sm font-semibold text-white">
              UNPRO construit l'infrastructure IA des services résidentiels au Québec.
            </p>
          </div>
        </section>

        {/* Avantages + Exemple */}
        <section className="max-w-6xl mx-auto px-5 py-16 grid md:grid-cols-3 gap-5">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <MapPin className="w-6 h-6 text-amber-400 mb-3" />
            <h3 className="font-semibold text-white mb-2">Places limitées</h3>
            <p className="text-xs text-white/60">Certaines villes et catégories auront des exclusivités territoriales.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <TrendingUp className="w-6 h-6 text-amber-400 mb-3" />
            <h3 className="font-semibold text-white mb-2">Revenus évolutifs</h3>
            <p className="text-xs text-white/60">Plus votre portefeuille d'entrepreneurs grandit, plus vos revenus récurrents augmentent.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <Sparkles className="w-6 h-6 text-amber-400 mb-3" />
            <h3 className="font-semibold text-white mb-2">Potentiel long terme</h3>
            <p className="text-xs text-white/60">Les partenaires qui entrent tôt bénéficieront des futures expansions de l'écosystème UNPRO.</p>
          </div>
        </section>

        <section className="max-w-3xl mx-auto px-5 py-10">
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent p-8 text-center">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-4">Exemple simple</h3>
            <p className="text-white/80 mb-4">10 entrepreneurs Premium à 599 $/mois :</p>
            <div className="text-4xl md:text-5xl font-bold text-amber-400 mb-2">~1 797 $/mois</div>
            <p className="text-sm text-white/60 mb-3">à 30 % pendant 24 mois</p>
            <p className="text-sm text-white/70">↓ puis 10 % résiduel à long terme</p>
            <p className="mt-5 text-xs uppercase tracking-wider font-semibold text-white">Et ce, sans plafond de croissance.</p>
          </div>
        </section>

        {/* Formulaire */}
        <section id="apply" className="max-w-2xl mx-auto px-5 py-20">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Devenez Partenaire Certifié</h2>
            <p className="text-sm text-white/60">Plus qu'une plateforme. Une infrastructure IA pour les entrepreneurs du Québec.</p>
          </div>

          {isSuccess ? (
            <FormSuccess
              referenceCode={result?.reference_code}
              title="Candidature reçue !"
              message="Notre équipe vous contacte sous peu pour valider votre profil."
            />
          ) : (
            <form onSubmit={onSubmit} className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8 space-y-4">
              <div>
                <Label htmlFor="salutation" className="text-white/80">Salutations</Label>
                <Select value={form.salutation} onValueChange={v => update("salutation", v)}>
                  <SelectTrigger id="salutation" className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Choisir..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M.">M.</SelectItem>
                    <SelectItem value="Mme">Mme</SelectItem>
                    <SelectItem value="Autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name" className="text-white/80">Prénom *</Label>
                  <Input id="first_name" required value={form.first_name} onChange={e => update("first_name", e.target.value)} className="bg-white/5 border-white/10 text-white" />
                </div>
                <div>
                  <Label htmlFor="last_name" className="text-white/80">Nom *</Label>
                  <Input id="last_name" required value={form.last_name} onChange={e => update("last_name", e.target.value)} className="bg-white/5 border-white/10 text-white" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone" className="text-white/80">Téléphone *</Label>
                  <Input id="phone" type="tel" required value={form.phone} onChange={e => update("phone", e.target.value)} className="bg-white/5 border-white/10 text-white" />
                </div>
                <div>
                  <Label htmlFor="email" className="text-white/80">Courriel *</Label>
                  <Input id="email" type="email" required value={form.email} onChange={e => update("email", e.target.value)} className="bg-white/5 border-white/10 text-white" />
                </div>
              </div>

              <div>
                <Label htmlFor="message" className="text-white/80">Parlez-nous un peu de vous !</Label>
                <Textarea id="message" rows={4} value={form.message} onChange={e => update("message", e.target.value)} className="bg-white/5 border-white/10 text-white" placeholder="Votre rôle, votre réseau, vos objectifs..." />
              </div>

              {isError && <FormErrorRetry message={error || undefined} onRetry={retry} isRetrying={isSubmitting} />}

              <Button type="submit" disabled={isSubmitting} size="lg" className="w-full bg-amber-500 hover:bg-amber-400 text-[#060B14] font-semibold">
                {isSubmitting ? "Envoi..." : "Soumettre ma candidature"}
              </Button>
            </form>
          )}

          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-white/60">
            <a href="https://unpro.ca" className="flex items-center gap-2 hover:text-amber-400"><Globe className="w-4 h-4" />unpro.ca</a>
            <a href="mailto:partenaires@unpro.ca" className="flex items-center gap-2 hover:text-amber-400"><Mail className="w-4 h-4" />partenaires@unpro.ca</a>
            <a href="tel:+15142499522" className="flex items-center gap-2 hover:text-amber-400"><Phone className="w-4 h-4" />(514) 249-9522</a>
          </div>
        </section>
      </main>
    </>
  );
}
