import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, FileText, Plus, AlertCircle, ChevronRight, Shield } from "lucide-react";
import { motion } from "framer-motion";
import PageHero from "@/components/shared/PageHero";
import EmptyState from "@/components/shared/EmptyState";
import { MOCK_PROPERTIES } from "@/data/mockProperties";

export default function MesProprietesPage() {
  const properties = MOCK_PROPERTIES;

  return (
    <>
      <Helmet>
        <title>Mes propriétés | UNPRO</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground font-display">Mes propriétés</h1>
            <p className="text-muted-foreground mt-1">Gérez vos propriétés et suivez leur état de santé.</p>
          </div>
          <Button asChild className="gap-2">
            <Link to="/dashboard/properties/new"><Plus className="h-4 w-4" /> Ajouter une propriété</Link>
          </Button>
        </div>

        {properties.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-16 w-16" />}
            title="Aucune propriété encore"
            description="Ajoutez votre première propriété pour commencer à suivre son état et recevoir des recommandations personnalisées."
            action={<Button asChild><Link to="/dashboard/properties/new">Créer ma première propriété</Link></Button>}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {properties.map((prop, i) => (
              <motion.div key={prop.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Card className="hover:shadow-lg transition-all duration-300 group h-full">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{prop.address}</h3>
                        <p className="text-sm text-muted-foreground">{prop.city} • {prop.propertyType} • {prop.yearBuilt}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        prop.status === "active" ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                      }`}>{prop.status === "active" ? "Actif" : "Brouillon"}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-2 rounded-lg bg-muted/50">
                        <div className="text-lg font-bold text-foreground">{prop.profileCompletion}%</div>
                        <div className="text-xs text-muted-foreground">Profil</div>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/50">
                        <div className="text-lg font-bold text-foreground">{prop.homeScore ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">Score</div>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/50">
                        <div className="text-lg font-bold text-foreground">{prop.documentCount}</div>
                        <div className="text-xs text-muted-foreground">Docs</div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Link to={`/dashboard/properties/${prop.id}/passport`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-muted/50">
                        <FileText className="h-3.5 w-3.5" /> Voir le passeport maison <ChevronRight className="h-3 w-3 ml-auto" />
                      </Link>
                      <Link to="/dashboard/documents/upload" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-muted/50">
                        <Plus className="h-3.5 w-3.5" /> Ajouter des documents <ChevronRight className="h-3 w-3 ml-auto" />
                      </Link>
                      <Link to="/decrire-mon-projet" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-muted/50">
                        <AlertCircle className="h-3.5 w-3.5" /> Décrire un problème <ChevronRight className="h-3 w-3 ml-auto" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6 flex items-start gap-4">
            <Shield className="h-8 w-8 text-primary shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-foreground">Pourquoi compléter votre profil propriété?</h3>
              <p className="text-sm text-muted-foreground mt-1">Un profil complet permet à nos algorithmes de mieux cibler les professionnels adaptés, d'anticiper les problèmes saisonniers et de vous fournir un score maison précis.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
