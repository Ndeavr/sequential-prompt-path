/**
 * UNPRO — Growth CTA Block
 * Conversion-oriented action block for SEO pages and public pages.
 */

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Search, Home, MessageCircle } from "lucide-react";

interface GrowthCtaBlockProps {
  showAlex?: boolean;
  cityName?: string;
}

const GrowthCtaBlock = ({ showAlex = false, cityName }: GrowthCtaBlockProps) => {
  const location = cityName ? ` à ${cityName}` : "";

  const actions = [
    {
      icon: Upload,
      title: "Analyser 3 soumissions",
      description: "Comparez vos devis gratuitement avec notre IA",
      to: "/dashboard/quotes/upload",
    },
    {
      icon: Search,
      title: "Trouver un entrepreneur",
      description: `Entrepreneurs vérifiés${location}`,
      to: `/search${cityName ? `?city=${cityName}` : ""}`,
    },
    {
      icon: Home,
      title: "Voir mon score maison",
      description: "Évaluez l'état de votre propriété",
      to: "/dashboard/home-score",
    },
  ];

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-foreground">Passez à l'action</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {actions.map((a) => (
          <Card key={a.to} className="hover:border-primary/50 transition-colors">
            <CardContent className="p-4 space-y-2">
              <a.icon className="h-5 w-5 text-primary" />
              <p className="font-medium text-sm text-foreground">{a.title}</p>
              <p className="text-xs text-muted-foreground">{a.description}</p>
              <Button asChild size="sm" variant="outline" className="w-full">
                <Link to={a.to}>Commencer</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      {showAlex && (
        <p className="text-sm text-muted-foreground text-center">
          <MessageCircle className="inline h-4 w-4 mr-1" />
          Besoin d'aide ? <Link to="/signup" className="text-primary hover:underline">Créez un compte</Link> pour parler avec Alex, votre assistant IA.
        </p>
      )}
    </section>
  );
};

export default GrowthCtaBlock;
