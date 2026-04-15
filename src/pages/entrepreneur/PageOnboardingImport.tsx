import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PanelGoogleBusinessSearchTester from "@/components/go-live/PanelGoogleBusinessSearchTester";
import CardBusinessImportPreview from "@/components/go-live/CardBusinessImportPreview";
import type { GmbCandidate } from "@/components/go-live/FormGoogleBusinessLookup";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PageOnboardingImport() {
  const [candidate, setCandidate] = useState<GmbCandidate | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleConfirmImport = async () => {
    if (!candidate) return;
    setIsImporting(true);
    try {
      const { error } = await supabase.from("contractor_import_snapshots").insert({
        business_name: candidate.name,
        google_place_id: candidate.place_id,
        business_payload: {
          formatted_address: candidate.formatted_address,
          phone: candidate.phone,
          website: candidate.website,
          rating: candidate.rating,
          review_count: candidate.review_count,
          categories: candidate.all_categories,
          photos: candidate.photos,
          opening_hours: candidate.opening_hours,
        } as any,
        import_source: "onboarding_entrepreneur",
      });
      if (error) throw error;
      toast({ title: "Import réussi ✓", description: `${candidate.name} importé avec succès.` });
      navigate("/entrepreneur/onboarding/analyse");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  const handleManualImport = async (data: { business_name: string; city: string; phone: string; website: string }) => {
    try {
      const { error } = await supabase.from("contractor_import_snapshots").insert({
        business_name: data.business_name,
        business_payload: { city: data.city, phone: data.phone, website: data.website } as any,
        import_source: "manual_onboarding",
      });
      if (error) throw error;
      toast({ title: "Import réussi ✓", description: `${data.business_name} importé.` });
      navigate("/entrepreneur/onboarding/analyse");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Importer votre entreprise
          </h1>
          <p className="text-xs text-muted-foreground">Étape 1/5 — Recherchez votre entreprise sur Google</p>
        </div>
      </div>

      {candidate ? (
        <CardBusinessImportPreview
          candidate={candidate}
          onConfirm={handleConfirmImport}
          onCancel={() => setCandidate(null)}
          isImporting={isImporting}
        />
      ) : (
        <PanelGoogleBusinessSearchTester
          onImport={setCandidate}
          onManualImport={handleManualImport}
        />
      )}
    </div>
  );
}
