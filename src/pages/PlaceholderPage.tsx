/**
 * UNPRO — Placeholder Page
 * Used for routes that exist in navigation but don't have full implementations yet.
 */

import { useLocation, Link } from "react-router-dom";
import { Construction, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import MainLayout from "@/layouts/MainLayout";
import { useLanguage } from "@/components/ui/LanguageToggle";

const pageTitles: Record<string, { fr: string; en: string }> = {
  "/proprietaires/passeport-maison": { fr: "Passeport Maison", en: "Home Passport" },
  "/proprietaires/score-maison": { fr: "Mon Score Maison", en: "My Home Score" },
  "/dashboard/maintenance": { fr: "Entretien recommandé", en: "Recommended Maintenance" },
  "/outils-ia": { fr: "Outils IA", en: "AI Tools" },
  "/services/isolation-grenier": { fr: "Isolation de grenier", en: "Attic Insulation" },
  "/services/toiture": { fr: "Toiture", en: "Roofing" },
  "/services/fondation": { fr: "Fondation", en: "Foundation" },
  "/services/fenetres": { fr: "Fenêtres", en: "Windows" },
  "/services/chauffage": { fr: "Chauffage", en: "Heating" },
  "/entrepreneurs/creer-mon-profil": { fr: "Créer mon profil", en: "Create My Profile" },
  "/entrepreneurs/pages-ia": { fr: "Pages IA / SEO", en: "AI / SEO Pages" },
  "/entrepreneurs/score-aipp": { fr: "Score AIPP", en: "AIPP Score" },
  "/entrepreneurs/profil-public": { fr: "Profil public", en: "Public Profile" },
  "/entrepreneurs/matching": { fr: "Matching propriétaires", en: "Homeowner Matching" },
  "/entrepreneurs/badges": { fr: "Badges UNPRO", en: "UNPRO Badges" },
  "/entrepreneurs/demo": { fr: "Démo", en: "Demo" },
  "/entrepreneurs/ambassadeur": { fr: "Programme ambassadeur", en: "Ambassador Program" },
  "/ambassadeurs": { fr: "Devenir ambassadeur", en: "Become an Ambassador" },
  "/pro/stats": { fr: "Statistiques", en: "Statistics" },
  "/pro/visibility": { fr: "Optimiser visibilité", en: "Optimize Visibility" },
  "/pro/recommendations": { fr: "Recommandations IA", en: "AI Recommendations" },
  "/aide": { fr: "Centre d'aide", en: "Help Center" },
  "/condo/passeport": { fr: "Passeport immeuble", en: "Building Passport" },
  "/condo/documents": { fr: "Documents condo", en: "Condo Documents" },
  "/condo/dashboard": { fr: "Tableau de bord condo", en: "Condo Dashboard" },
  "/condo/dossier": { fr: "Créer dossier condo", en: "Create Condo File" },
  "/condo/travaux": { fr: "Planifier travaux", en: "Plan Work" },
  "/condo/historique": { fr: "Historique", en: "History" },
  "/condo/inviter": { fr: "Inviter copropriétaires", en: "Invite Co-owners" },
  "/condo/loi-16": { fr: "Loi 16", en: "Bill 16" },
  "/condo/inspection": { fr: "Inspection", en: "Inspection" },
  "/condo/guides": { fr: "Guides condo", en: "Condo Guides" },
  "/professionnels": { fr: "Professionnels", en: "Professionals" },
  "/villes": { fr: "Villes", en: "Cities" },
  "/guides": { fr: "Guides", en: "Guides" },
  "/blog": { fr: "Blog", en: "Blog" },
  "/conseils-renovation": { fr: "Conseils rénovation", en: "Renovation Tips" },
  "/faq": { fr: "FAQ", en: "FAQ" },
  "/comment-ca-marche": { fr: "Comment fonctionne UNPRO", en: "How UNPRO Works" },
  "/verification": { fr: "Vérification entreprises", en: "Company Verification" },
  "/nos-standards": { fr: "Nos standards", en: "Our Standards" },
  "/pourquoi-pas-3-soumissions": { fr: "Pourquoi éviter les 3 soumissions", en: "Why Avoid 3 Quotes" },
  "/a-propos": { fr: "À propos", en: "About" },
  "/partenaires": { fr: "Partenaires", en: "Partners" },
  "/contact": { fr: "Contact", en: "Contact" },
  "/conditions": { fr: "Conditions d'utilisation", en: "Terms of Service" },
  "/confidentialite": { fr: "Politique de confidentialité", en: "Privacy Policy" },
  "/cookies": { fr: "Politique de cookies", en: "Cookie Policy" },
  "/sitemap": { fr: "Plan du site", en: "Sitemap" },
  "/accessibilite": { fr: "Accessibilité", en: "Accessibility" },
};

const PlaceholderPage = () => {
  const { pathname } = useLocation();
  const { lang } = useLanguage();

  const title = pageTitles[pathname]
    ? (lang === "en" ? pageTitles[pathname].en : pageTitles[pathname].fr)
    : pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ") || "Page";

  return (
    <MainLayout>
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md mx-auto">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-6">
            <Construction className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-3 capitalize">
            {title}
          </h1>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            {lang === "en"
              ? "This page is under construction. We're working hard to bring you this feature soon."
              : "Cette page est en construction. Nous travaillons à vous offrir cette fonctionnalité bientôt."}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" asChild className="rounded-full">
              <Link to="/">
                <Home className="h-4 w-4 mr-2" />
                {lang === "en" ? "Home" : "Accueil"}
              </Link>
            </Button>
            <Button variant="outline" asChild className="rounded-full" onClick={() => window.history.back()}>
              <span>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {lang === "en" ? "Go Back" : "Retour"}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default PlaceholderPage;
