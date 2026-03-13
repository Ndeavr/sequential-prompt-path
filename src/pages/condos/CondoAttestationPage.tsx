/**
 * UNPRO Condos — Attestation du syndicat SEO Page
 */
import { Link } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText, ArrowRight, Building2, Shield, CheckCircle2, ChevronDown
} from "lucide-react";

const contents = [
  "État du fonds de prévoyance",
  "Existence d'un carnet d'entretien",
  "Cotisations spéciales en cours ou prévues",
  "Litiges en cours",
  "Travaux majeurs planifiés",
  "Conformité aux obligations légales",
  "Nombre de copropriétaires en défaut de paiement",
];

const faqs = [
  { q: "Qu'est-ce qu'une attestation du syndicat?", a: "C'est un document officiel que le syndicat de copropriété doit fournir à tout acheteur potentiel. Il résume l'état financier et administratif de la copropriété." },
  { q: "Quand est-elle requise?", a: "L'attestation est obligatoire lors de la vente d'une unité de copropriété. Le promettant-acheteur peut l'exiger et a le droit de se retirer si elle n'est pas fournie." },
  { q: "Qui la prépare?", a: "C'est la responsabilité du syndicat de copropriété (administrateurs ou gestionnaire mandaté). UNPRO Condos facilite la génération de ce document." },
  { q: "UNPRO peut-il générer l'attestation automatiquement?", a: "Oui (Premium). Si votre Passeport Immeuble est à jour, UNPRO peut pré-remplir une attestation avec les données de votre dossier. Vous devrez la valider et la signer." },
];

const CondoAttestationPage = () => (
  <MainLayout>
    <section className="py-16 sm:py-24 bg-gradient-to-b from-secondary/5 via-background to-background">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <Badge className="mb-5 bg-secondary/10 text-secondary border-secondary/20">
          <FileText className="h-3.5 w-3.5 mr-1.5" /> Document officiel
        </Badge>
        <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight mb-5">
          Attestation du syndicat de copropriété
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Préparez et générez l'attestation obligatoire pour la vente d'unités de copropriété avec UNPRO Condos.
        </p>
        <Button asChild size="lg" className="rounded-xl shadow-glow">
          <Link to="/condos/onboarding"><Building2 className="h-5 w-5 mr-2" /> Créer mon Passeport Immeuble</Link>
        </Button>
      </div>
    </section>

    <section className="py-16 bg-background">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="font-display text-2xl font-bold mb-6">Contenu de l'attestation</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-3xl">L'attestation du syndicat doit contenir les informations suivantes pour être conforme au Code civil du Québec :</p>
        <Card className="border-border/40 bg-card/90">
          <CardContent className="p-5 space-y-3">
            {contents.map((c, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                <span className="text-sm">{c}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>

    <section className="py-16 bg-muted/30">
      <div className="max-w-3xl mx-auto px-4">
        <h2 className="font-display text-2xl font-bold text-center mb-8">Questions fréquentes</h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <details key={i} className="group">
              <summary className="flex items-center justify-between p-4 rounded-xl bg-card/80 border border-border/40 cursor-pointer">
                <span className="font-medium text-sm pr-4">{faq.q}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground group-open:rotate-180 transition-transform flex-shrink-0" />
              </summary>
              <div className="px-4 pb-4 pt-2 text-sm text-muted-foreground leading-relaxed">{faq.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>

    <section className="py-16 bg-gradient-to-b from-background to-primary/5 text-center">
      <div className="max-w-3xl mx-auto px-4">
        <h2 className="font-display text-2xl font-bold mb-4">Simplifiez vos attestations</h2>
        <p className="text-muted-foreground mb-6">Avec un Passeport Immeuble à jour, l'attestation se génère en quelques clics.</p>
        <Button asChild size="lg" className="rounded-xl shadow-glow">
          <Link to="/condos/onboarding">Commencer gratuitement <ArrowRight className="h-4 w-4 ml-2" /></Link>
        </Button>
      </div>
    </section>
  </MainLayout>
);

export default CondoAttestationPage;
