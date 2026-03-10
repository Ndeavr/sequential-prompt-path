import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Search, Home as HomeIcon, Shield, TrendingUp, Users, MapPin } from "lucide-react";

const Home = () => {
  const { isAuthenticated, role } = useAuth();

  const getDashboardLink = () => {
    if (role === "contractor") return "/pro";
    if (role === "admin") return "/admin";
    return "/dashboard";
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-4 py-16 md:py-24 text-center">
        <div className="space-y-6 max-w-2xl">
          <h1 className="text-5xl font-bold tracking-tight text-foreground">UNPRO</h1>
          <p className="text-xl text-muted-foreground">
            Intelligence immobilière propulsée par l'IA pour propriétaires et entrepreneurs.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-4">
            {isAuthenticated ? (
              <Button asChild size="lg"><Link to={getDashboardLink()}>Mon tableau de bord</Link></Button>
            ) : (
              <>
                <Button asChild size="lg"><Link to="/signup">Créer un compte</Link></Button>
                <Button asChild size="lg" variant="outline"><Link to="/login">Se connecter</Link></Button>
              </>
            )}
            <Button asChild size="lg" variant="outline"><Link to="/search">Trouver un entrepreneur</Link></Button>
          </div>
        </div>
      </section>

      {/* Homeowner actions */}
      <section className="max-w-4xl mx-auto w-full px-4 pb-12 space-y-4">
        <h2 className="text-lg font-bold text-foreground text-center">Passez à l'action</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Upload, title: "Analyser une soumission", desc: "IA analyse vos devis gratuitement", to: isAuthenticated ? "/dashboard/quotes/upload" : "/signup" },
            { icon: Search, title: "Trouver un entrepreneur", desc: "Entrepreneurs vérifiés près de chez vous", to: "/search" },
            { icon: HomeIcon, title: "Score maison", desc: "Évaluez l'état de votre propriété", to: isAuthenticated ? "/dashboard/home-score" : "/signup" },
          ].map((a) => (
            <Card key={a.title} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-5 space-y-2">
                <a.icon className="h-6 w-6 text-primary" />
                <p className="font-semibold text-foreground">{a.title}</p>
                <p className="text-sm text-muted-foreground">{a.desc}</p>
                <Button asChild size="sm" variant="outline" className="w-full">
                  <Link to={a.to}>Commencer</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Contractor acquisition */}
      <section className="bg-muted/50 py-12 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Vous êtes entrepreneur?</h2>
            <p className="text-muted-foreground">Rejoignez UNPRO pour recevoir des demandes qualifiées.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: TrendingUp, label: "Score AIPP", desc: "Mesurez votre performance" },
              { icon: Users, label: "Leads qualifiés", desc: "Demandes vérifiées" },
              { icon: MapPin, label: "Territoires exclusifs", desc: "Accès par zone" },
              { icon: Shield, label: "Profil vérifié", desc: "Badge de confiance" },
            ].map((item) => (
              <div key={item.label} className="text-center space-y-1">
                <item.icon className="h-6 w-6 text-primary mx-auto" />
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-3">
            <Button asChild size="lg"><Link to="/signup">Activer mon profil</Link></Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
