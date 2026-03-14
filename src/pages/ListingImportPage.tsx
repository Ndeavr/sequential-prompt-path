/**
 * UNPRO — Listing Import Page
 * French-first page: "Analyser une fiche immobilière"
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import DashboardLayout from "@/layouts/DashboardLayout";
import { PageHeader } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { submitListingImport, detectPlatform } from "@/services/property/listingImportService";
import { FileSearch, Link2, ArrowRight, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

export default function ListingImportPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [url, setUrl] = useState("");

  const platform = url.length > 10 ? detectPlatform(url) : null;

  const importMutation = useMutation({
    mutationFn: () => submitListingImport(url, user!.id),
    onSuccess: (result) => {
      toast({
        title: "Import soumis ✓",
        description: "Votre fiche sera analysée sous peu. Un Passeport Maison initial sera créé.",
      });
      if (result.property_id) {
        navigate(`/dashboard/properties/${result.property_id}/passport`);
      } else {
        navigate("/dashboard/properties");
      }
    },
    onError: (err: Error) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  const isValidUrl = url.startsWith("http://") || url.startsWith("https://");

  return (
    <DashboardLayout>
      <PageHeader
        title="Analyser une fiche immobilière"
        description="Collez le lien d'une fiche de vente pour créer un Passeport Maison initial."
      />

      <div className="max-w-xl space-y-6">
        <Card className="border-border/50 shadow-[var(--shadow-lg)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSearch className="h-5 w-5 text-primary" />
              Lien de la fiche
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                type="url"
                placeholder="https://www.centris.ca/fr/maison~a-vendre~..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="text-sm"
              />
              {platform && platform !== "other" && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs capitalize">
                    <Link2 className="h-3 w-3 mr-1" />
                    {platform}
                  </Badge>
                  <span className="text-xs text-muted-foreground">Plateforme détectée</span>
                </div>
              )}
            </div>

            <Button
              onClick={() => importMutation.mutate()}
              disabled={!isValidUrl || importMutation.isPending}
              className="w-full gap-2"
            >
              {importMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Analyse en cours...</>
              ) : (
                <><ArrowRight className="h-4 w-4" /> Créer le Passeport Maison initial</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Info cards */}
        <Card className="border-border/40">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Ce que nous extrayons</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Adresse, type de propriété, année de construction, superficie, nombre de pièces, 
                  caractéristiques principales et description.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warning mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Important</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Les données extraites sont un point de départ estimé. Complétez et corrigez 
                  les informations dans votre Passeport Maison pour améliorer la précision du score.
                  Ceci ne remplace pas une inspection professionnelle.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Supported platforms */}
        <p className="text-xs text-muted-foreground text-center">
          Plateformes supportées : Centris, Realtor.ca, RE/MAX, Sutton, Royal LePage, DuProprio
        </p>
      </div>
    </DashboardLayout>
  );
}
