import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PenLine, Camera, ArrowRight, Shield, Clock, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import PageHero from "@/components/shared/PageHero";
import RelatedLinksSection from "@/components/shared/RelatedLinksSection";

const PROJECT_TYPES = ["Toiture", "Isolation", "Fondation", "Plomberie", "Électricité", "Fenêtres", "Cuisine", "Salle de bain", "Sous-sol", "Rénovation complète", "Autre"];

export default function DecrireMonProjetPage() {
  return (
    <>
      <Helmet>
        <title>Décrire mon projet de rénovation | UNPRO</title>
        <meta name="description" content="Décrivez votre projet de rénovation en quelques étapes. Simple, rapide, sans engagement. Obtenez un rendez-vous garanti." />
        <link rel="canonical" href="https://unpro.ca/decrire-mon-projet" />
      </Helmet>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">
        <PageHero
          title="Décrire mon projet"
          subtitle="En quelques étapes, expliquez-nous votre besoin. Nous trouverons le bon professionnel pour vous."
          compact
        />

        {/* Step form */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-5">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Type de travaux</label>
                <div className="flex flex-wrap gap-2">
                  {PROJECT_TYPES.map((t) => (
                    <button key={t} className="px-3 py-1.5 rounded-full text-sm border border-border hover:border-primary hover:text-primary transition-all">
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Ville</label>
                  <input className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Ex: Laval, Montréal..." />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Type de propriété</label>
                  <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                    <option>Maison unifamiliale</option>
                    <option>Condo</option>
                    <option>Duplex / Triplex</option>
                    <option>Cottage</option>
                    <option>Bungalow</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Décrivez votre projet ou problème</label>
                <textarea className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[100px]" placeholder="Ex: Ma toiture coule depuis 2 semaines, j'ai des taches d'eau au plafond..." />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Urgence</label>
                  <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                    <option>Pas urgent</option>
                    <option>Dans les prochaines semaines</option>
                    <option>Urgent — cette semaine</option>
                    <option>Urgence immédiate</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Budget approximatif</label>
                  <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                    <option>Moins de 5 000 $</option>
                    <option>5 000 $ - 15 000 $</option>
                    <option>15 000 $ - 50 000 $</option>
                    <option>Plus de 50 000 $</option>
                    <option>Je ne sais pas</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Échéancier</label>
                  <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                    <option>Dès que possible</option>
                    <option>Dans 1-2 mois</option>
                    <option>Dans 3-6 mois</option>
                    <option>Juste explorer</option>
                  </select>
                </div>
              </div>

              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center space-y-2">
                <Camera className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                <p className="text-sm text-muted-foreground">Ajoutez des photos (optionnel)</p>
              </div>

              <Button size="lg" className="w-full gap-2">
                Continuer <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Reassurance */}
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { icon: <PenLine className="h-5 w-5" />, label: "Simple" },
            { icon: <Clock className="h-5 w-5" />, label: "2 minutes" },
            { icon: <Shield className="h-5 w-5" />, label: "Sans engagement" },
          ].map((item) => (
            <div key={item.label} className="p-3 rounded-xl bg-muted/50 space-y-1">
              <div className="text-primary mx-auto w-fit">{item.icon}</div>
              <div className="text-sm font-medium text-muted-foreground">{item.label}</div>
            </div>
          ))}
        </div>

        <RelatedLinksSection links={[
          { to: "/trouver-un-entrepreneur", label: "Trouver un entrepreneur" },
          { to: "/parler-a-alex", label: "Parler à Alex" },
          { to: "/problemes-maison", label: "Problèmes maison" },
        ]} />
      </div>
    </>
  );
}
