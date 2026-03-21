/**
 * UNPRO — Broker Qualification Modal
 * Multi-step qualification: city, specialty, volume, goals, then sector check.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, MapPin, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CITIES = ["Montréal", "Laval", "Longueuil", "Québec", "Gatineau", "Sherbrooke", "Trois-Rivières", "Lévis", "Terrebonne", "Saint-Jean-sur-Richelieu"];
const SPECIALTIES = ["Résidentiel", "Condo", "Plex", "Commercial", "Luxe", "Premier acheteur", "Investissement"];
const VOLUMES = ["1-10 transactions/an", "10-25 transactions/an", "25-50 transactions/an", "50+ transactions/an"];

type Step = "city" | "specialty" | "volume" | "checking" | "result";

interface AvailabilityResult {
  available: boolean;
  activeSlots: number;
  maxSlots: number;
  waitingCount: number;
}

export default function BrokerQualificationModal({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("city");
  const [city, setCity] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [volume, setVolume] = useState("");
  const [result, setResult] = useState<AvailabilityResult | null>(null);

  const toggleSpecialty = (s: string) => {
    setSpecialties(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const checkAvailability = async () => {
    setStep("checking");
    try {
      const citySlug = city.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");
      const specialtySlug = specialties[0]?.toLowerCase() || "residentiel";

      const { data } = await supabase
        .from("market_capacity")
        .select("*")
        .eq("city", citySlug)
        .eq("specialty", specialtySlug)
        .maybeSingle();

      if (data) {
        setResult({
          available: data.active_slots < data.max_slots,
          activeSlots: data.active_slots,
          maxSlots: data.max_slots,
          waitingCount: data.waiting_list_count,
        });
      } else {
        // No record = available
        setResult({ available: true, activeSlots: 0, maxSlots: 3, waitingCount: 0 });
      }
    } catch {
      setResult({ available: true, activeSlots: 0, maxSlots: 3, waitingCount: 0 });
    }
    setStep("result");
  };

  const handleContinue = () => {
    onOpenChange(false);
    navigate("/courtiers/onboarding");
  };

  const reset = () => {
    setStep("city");
    setCity("");
    setSpecialties([]);
    setVolume("");
    setResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "city" && "Dans quelle ville exercez-vous?"}
            {step === "specialty" && "Vos spécialités"}
            {step === "volume" && "Votre volume d'affaires"}
            {step === "checking" && "Vérification en cours..."}
            {step === "result" && (result?.available ? "Place disponible!" : "Liste d'attente")}
          </DialogTitle>
        </DialogHeader>

        {step === "city" && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {CITIES.map((c) => (
                <Badge
                  key={c}
                  variant={city === c ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setCity(c)}
                >
                  {c}
                </Badge>
              ))}
            </div>
            <Input
              placeholder="Autre ville..."
              value={!CITIES.includes(city) ? city : ""}
              onChange={(e) => setCity(e.target.value)}
            />
            <Button className="w-full" disabled={!city} onClick={() => setStep("specialty")}>
              Continuer
            </Button>
          </div>
        )}

        {step === "specialty" && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {SPECIALTIES.map((s) => (
                <Badge
                  key={s}
                  variant={specialties.includes(s) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleSpecialty(s)}
                >
                  {s}
                </Badge>
              ))}
            </div>
            <Button className="w-full" disabled={specialties.length === 0} onClick={() => setStep("volume")}>
              Continuer
            </Button>
          </div>
        )}

        {step === "volume" && (
          <div className="space-y-3">
            {VOLUMES.map((v) => (
              <Button
                key={v}
                variant={volume === v ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => setVolume(v)}
              >
                {v}
              </Button>
            ))}
            <Button className="w-full" disabled={!volume} onClick={checkAvailability}>
              Vérifier la disponibilité
            </Button>
          </div>
        )}

        {step === "checking" && (
          <div className="flex flex-col items-center py-8 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Vérification de {city}...</p>
          </div>
        )}

        {step === "result" && result && (
          <div className="space-y-4">
            {result.available ? (
              <>
                <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10">
                  <CheckCircle className="h-8 w-8 text-primary shrink-0" />
                  <div>
                    <p className="font-bold text-foreground">Place disponible à {city}!</p>
                    <p className="text-sm text-muted-foreground">
                      {result.activeSlots}/{result.maxSlots} places occupées.
                      {result.maxSlots - result.activeSlots <= 1 && " Dernière place!"}
                    </p>
                  </div>
                </div>
                <Button className="w-full" onClick={handleContinue}>
                  Activer mon profil courtier
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-8 w-8 text-destructive shrink-0" />
                  <div>
                    <p className="font-bold text-foreground">Territoire complet à {city}</p>
                    <p className="text-sm text-muted-foreground">
                      {result.waitingCount} courtier{result.waitingCount > 1 ? "s" : ""} en attente.
                    </p>
                  </div>
                </div>
                <Button variant="outline" className="w-full" onClick={async () => {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (user) {
                    const citySlug = city.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");
                    await supabase.from("broker_waitlist" as any).insert({
                      profile_id: user.id,
                      city: citySlug,
                      specialty: specialties[0]?.toLowerCase() || "residentiel",
                      volume: volume,
                    });
                  }
                  toast.info("Vous serez notifié dès qu'une place se libère.");
                  onOpenChange(false);
                }}>
                  Rejoindre la liste d'attente
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
