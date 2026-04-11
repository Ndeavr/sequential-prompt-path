/**
 * PageAjouterSoumissionAuDossier — Add a quote to client record
 */
import { Helmet } from "react-helmet-async";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { FormSoumissionDossierClient } from "@/features/quoteAnalyzer";

// Mock properties
const MOCK_PROPERTIES = [
  { id: "p1", name: "Condo Laval — 123 Boul. des Laurentides" },
  { id: "p2", name: "Maison Montréal — 456 Rue Saint-Denis" },
];

export default function PageAjouterSoumissionAuDossier() {
  const navigate = useNavigate();

  const handleSubmit = (data: any) => {
    // TODO: insert into client_record_quotes + upload file
    toast.success("Soumission enregistrée au dossier");
    navigate("/dossier-soumissions");
  };

  return (
    <>
      <Helmet>
        <title>Ajouter une soumission au dossier | UNPRO</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="max-w-lg mx-auto px-5 py-8 space-y-6">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="shrink-0">
              <Link to="/dossier-soumissions"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground">Ajouter une soumission au dossier</h1>
              <p className="text-xs text-muted-foreground">Archiver dans le dossier de la propriété</p>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              <FormSoumissionDossierClient
                properties={MOCK_PROPERTIES}
                onSubmit={handleSubmit}
                onCancel={() => navigate(-1)}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
