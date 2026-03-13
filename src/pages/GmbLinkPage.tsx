import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Loader2, CheckCircle2, XCircle, MapPin, Phone, Globe,
  Star, Camera, Clock, ArrowRight, Shield, AlertTriangle, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import MainLayout from "@/layouts/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface GmbResult {
  place_id: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  rating: number;
  review_count: number;
  category_primary: string;
  categories_secondary: string[];
  hours: string[];
  photo_count: number;
  description: string;
  latitude: number;
  longitude: number;
  match_confidence: number;
  match_signals: {
    name_match: number;
    phone_match: number;
    domain_match: number;
    address_match: number;
    city_match: number;
  };
  is_mock: boolean;
}

type Phase = "loading" | "results" | "confirming" | "done" | "error";

function confidenceLabel(c: number): { text: string; color: string } {
  if (c >= 0.8) return { text: "Excellent", color: "text-green-600" };
  if (c >= 0.6) return { text: "Bon", color: "text-yellow-600" };
  if (c >= 0.4) return { text: "Partiel", color: "text-orange-500" };
  return { text: "Faible", color: "text-red-500" };
}

function SignalBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 text-muted-foreground">{label}</span>
      <Progress value={value * 100} className="h-1.5 flex-1" />
      <span className="w-10 text-right font-medium">{Math.round(value * 100)}%</span>
    </div>
  );
}

export default function GmbLinkPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>("loading");
  const [results, setResults] = useState<GmbResult[]>([]);
  const [contractorId, setContractorId] = useState<string | null>(null);
  const [contractorName, setContractorName] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  // Load contractor and search GMB
  useEffect(() => {
    if (!user) return;

    const search = async () => {
      // Get contractor id
      const { data: contractor } = await supabase
        .from("contractors")
        .select("id, business_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!contractor) {
        toast({ title: "Aucun profil entrepreneur trouvé", description: "Créez d'abord votre profil.", variant: "destructive" });
        navigate("/pro/import");
        return;
      }

      setContractorId(contractor.id);
      setContractorName(contractor.business_name || "");

      try {
        const { data, error } = await supabase.functions.invoke("search-gmb-profile", {
          body: { contractor_id: contractor.id },
        });

        if (error) throw error;

        setResults(data.results || []);
        setPhase("results");
      } catch (err: any) {
        console.error("GMB search error:", err);
        setPhase("error");
        toast({ title: "Erreur de recherche", description: err.message, variant: "destructive" });
      }
    };

    search();
  }, [user]);

  const confirmLink = useCallback(async (result: GmbResult) => {
    if (!contractorId || !user) return;
    setIsLinking(true);

    try {
      // Save GMB profile link
      const { error: gmbErr } = await supabase.from("contractor_gmb_profiles" as any).upsert({
        contractor_id: contractorId,
        gmb_place_id: result.place_id,
        gmb_name: result.name,
        gmb_address: result.address,
        gmb_phone: result.phone,
        gmb_website: result.website,
        gmb_category_primary: result.category_primary,
        gmb_categories_secondary: result.categories_secondary,
        gmb_rating: result.rating,
        gmb_review_count: result.review_count,
        gmb_description: result.description,
        gmb_hours: result.hours,
        gmb_latitude: result.latitude,
        gmb_longitude: result.longitude,
        match_confidence: result.match_confidence,
        match_signals: result.match_signals,
        linked_by: user.id,
        is_confirmed: true,
        last_synced_at: new Date().toISOString(),
      } as any, { onConflict: "contractor_id,gmb_place_id" });

      if (gmbErr) throw gmbErr;

      // Save review aggregates
      await supabase.from("contractor_review_aggregates" as any).upsert({
        contractor_id: contractorId,
        data_source: "gmb",
        total_reviews: result.review_count,
        average_rating: result.rating,
        last_computed_at: new Date().toISOString(),
      } as any, { onConflict: "contractor_id,data_source" });

      // Update contractor with GMB data (only fields with lower priority)
      const { data: existing } = await supabase
        .from("contractors")
        .select("business_name, phone, website, description, city")
        .eq("id", contractorId)
        .single();

      if (existing) {
        const updates: Record<string, any> = {};
        // Only fill empty fields — don't overwrite existing
        if (!existing.phone && result.phone) updates.phone = result.phone;
        if (!existing.website && result.website) updates.website = result.website;
        if (!existing.description && result.description) updates.description = result.description;

        // Always update rating from GMB
        updates.google_rating = result.rating;
        updates.google_review_count = result.review_count;

        if (Object.keys(updates).length > 0) {
          await supabase.from("contractors").update(updates).eq("id", contractorId);
        }
      }

      // Add media entries for GMB photos
      if (result.photo_count > 0) {
        const mediaEntries = Array.from({ length: Math.min(result.photo_count, 10) }, (_, i) => ({
          contractor_id: contractorId,
          media_type: "photo",
          data_source: "gmb_imported",
          title: `Photo Google ${i + 1}`,
          is_approved: false,
          is_featured: false,
          display_order: 100 + i,
        }));

        await supabase.from("contractor_media").insert(mediaEntries);
      }

      setPhase("done");
      toast({ title: "Fiche Google associée ✓", description: "Les données ont été importées avec succès." });
    } catch (err: any) {
      console.error("Link error:", err);
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsLinking(false);
    }
  }, [contractorId, user, toast]);

  return (
    <MainLayout>
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium">
              <Globe className="w-4 h-4" />
              Google Business Profile
            </div>
            <h1 className="text-2xl font-bold text-foreground">Associer votre fiche Google</h1>
            <p className="text-muted-foreground text-sm">
              Enrichissez votre profil automatiquement avec vos données Google Maps.
            </p>
          </motion.div>

          {/* Loading */}
          {phase === "loading" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground text-sm">Recherche de votre fiche Google…</p>
            </motion.div>
          )}

          {/* Error */}
          {phase === "error" && (
            <Card className="border-destructive/30">
              <CardContent className="p-6 text-center space-y-4">
                <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />
                <p className="text-sm text-muted-foreground">Impossible de rechercher votre fiche Google pour le moment.</p>
                <Button variant="outline" onClick={() => { setPhase("loading"); window.location.reload(); }}>
                  Réessayer
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {phase === "results" && (
            <AnimatePresence>
              {results.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center space-y-3">
                    <Search className="w-10 h-10 text-muted-foreground mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      Aucune fiche Google trouvée pour « {contractorName} ».
                    </p>
                    <Button variant="outline" onClick={() => navigate("/pro")}>
                      Continuer sans Google
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {results.length} fiche{results.length > 1 ? "s" : ""} trouvée{results.length > 1 ? "s" : ""} pour « {contractorName} »
                  </p>

                  {results.map((r, i) => {
                    const conf = confidenceLabel(r.match_confidence);
                    return (
                      <motion.div
                        key={r.place_id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <Card
                          className={`cursor-pointer transition-all ${
                            selectedId === r.place_id
                              ? "ring-2 ring-primary border-primary"
                              : "hover:border-primary/40"
                          }`}
                          onClick={() => setSelectedId(selectedId === r.place_id ? null : r.place_id)}
                        >
                          <CardContent className="p-4 space-y-3">
                            {/* Top row */}
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-foreground truncate">{r.name}</h3>
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{r.address}</span>
                                </p>
                              </div>
                              <Badge variant={r.match_confidence >= 0.7 ? "default" : "secondary"} className="shrink-0 ml-2">
                                {Math.round(r.match_confidence * 100)}% match
                              </Badge>
                            </div>

                            {/* Stats row */}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-yellow-500" />
                                {r.rating}/5
                              </span>
                              <span>{r.review_count} avis</span>
                              <span className="flex items-center gap-1">
                                <Camera className="w-3 h-3" />
                                {r.photo_count} photos
                              </span>
                              {r.category_primary && (
                                <Badge variant="outline" className="text-[10px]">{r.category_primary}</Badge>
                              )}
                            </div>

                            {/* Expanded details */}
                            <AnimatePresence>
                              {selectedId === r.place_id && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden space-y-3"
                                >
                                  {/* Match signals */}
                                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                                    <p className="text-xs font-medium text-foreground">Signaux de correspondance</p>
                                    <SignalBar label="Nom" value={r.match_signals.name_match} />
                                    <SignalBar label="Téléphone" value={r.match_signals.phone_match} />
                                    <SignalBar label="Domaine" value={r.match_signals.domain_match} />
                                    <SignalBar label="Adresse" value={r.match_signals.address_match} />
                                    <SignalBar label="Ville" value={r.match_signals.city_match} />
                                  </div>

                                  {/* Contact info */}
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    {r.phone && (
                                      <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <Phone className="w-3 h-3" /> {r.phone}
                                      </div>
                                    )}
                                    {r.website && (
                                      <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                                        <Globe className="w-3 h-3 shrink-0" />
                                        <span className="truncate">{r.website}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Hours */}
                                  {r.hours.length > 0 && (
                                    <div className="text-xs space-y-0.5">
                                      <p className="font-medium text-foreground flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> Heures d'ouverture
                                      </p>
                                      {r.hours.map((h, j) => (
                                        <p key={j} className="text-muted-foreground pl-4">{h}</p>
                                      ))}
                                    </div>
                                  )}

                                  {/* Description */}
                                  {r.description && (
                                    <p className="text-xs text-muted-foreground italic">« {r.description} »</p>
                                  )}

                                  {/* Actions */}
                                  <div className="flex gap-2 pt-2">
                                    <Button
                                      size="sm"
                                      onClick={(e) => { e.stopPropagation(); confirmLink(r); }}
                                      disabled={isLinking}
                                      className="flex-1"
                                    >
                                      {isLinking ? (
                                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                      ) : (
                                        <CheckCircle2 className="w-4 h-4 mr-1" />
                                      )}
                                      C'est ma fiche
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => { e.stopPropagation(); setSelectedId(null); }}
                                      className="shrink-0"
                                    >
                                      <XCircle className="w-4 h-4 mr-1" />
                                      Non
                                    </Button>
                                  </div>

                                  {/* Trust notice */}
                                  <div className="flex items-start gap-2 bg-muted/30 rounded p-2">
                                    <Shield className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                                      Les données importées de Google n'accordent jamais automatiquement
                                      un badge vérifié UNPRO. Une validation admin est requise.
                                    </p>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}

                  {/* Skip button */}
                  <div className="text-center pt-2">
                    <Button variant="ghost" size="sm" onClick={() => navigate("/pro")} className="text-muted-foreground">
                      Aucune de ces fiches ne correspond <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </AnimatePresence>
          )}

          {/* Done */}
          {phase === "done" && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="border-green-500/30">
                <CardContent className="p-6 text-center space-y-4">
                  <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
                  <div>
                    <h3 className="font-semibold text-foreground">Fiche Google associée!</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Vos données Google ont été importées. Les champs vides de votre profil ont été enrichis.
                    </p>
                  </div>
                  <div className="flex items-start gap-2 bg-muted/30 rounded p-3 text-left">
                    <Shield className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Les données importées via Google sont enregistrées avec la source « gmb_imported ».
                      Elles ne remplacent jamais les données validées par un administrateur UNPRO.
                    </p>
                  </div>
                  <Button onClick={() => navigate("/pro")} className="w-full">
                    Voir mon tableau de bord <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
