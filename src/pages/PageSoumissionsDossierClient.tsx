/**
 * PageSoumissionsDossierClient — List of client record quotes
 */
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  CardSoumissionDossierClient,
  EmptyStateSoumissionsDossier,
  BadgeUsageSoumission,
} from "@/features/quoteAnalyzer";

// Mock data
const MOCK_QUOTES = [
  { id: "1", quote_title: "Rénovation cuisine — Plomberie ABC", quote_amount: 15000, quote_date: "2026-03-15", quote_status: "submitted", source_type: "contractor_upload", contractor_name: "Plomberie ABC" },
  { id: "2", quote_title: "Toiture — Pro-Toit Inc.", quote_amount: 12500, quote_date: "2026-02-20", quote_status: "accepted", source_type: "manual_record", contractor_name: "Pro-Toit Inc." },
  { id: "3", quote_title: "Fenêtres — Vitro Plus", quote_amount: 8700, quote_date: "2026-04-01", quote_status: "draft", source_type: "rep_upload", contractor_name: "Vitro Plus" },
];

export default function PageSoumissionsDossierClient() {
  const quotes = MOCK_QUOTES; // TODO: replace with real query

  return (
    <>
      <Helmet>
        <title>Soumissions du dossier | UNPRO</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="max-w-lg mx-auto px-5 py-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-foreground">Soumissions du dossier</h1>
              <p className="text-xs text-muted-foreground">Documents de soumission par propriété</p>
            </div>
            <div className="flex items-center gap-2">
              <BadgeUsageSoumission type="record" />
              <Button asChild size="sm" className="rounded-xl gap-1">
                <Link to="/dossier-soumissions/ajouter">
                  <Plus className="h-3.5 w-3.5" /> Ajouter
                </Link>
              </Button>
            </div>
          </div>

          {quotes.length === 0 ? (
            <EmptyStateSoumissionsDossier />
          ) : (
            <div className="space-y-3">
              {quotes.map((q) => (
                <CardSoumissionDossierClient
                  key={q.id}
                  quote={q}
                  onClick={() => {/* TODO: navigate to detail */}}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
