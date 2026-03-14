/**
 * UNPRO — Address Search Component
 * Places-ready autocomplete architecture with manual fallback.
 * Currently uses manual input. When Google Places API key is configured,
 * swap the input for a Places Autocomplete widget.
 */
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Search, MapPin, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { createProperty, findPropertyByAddress } from "@/services/property/propertyService";
import { useToast } from "@/hooks/use-toast";

interface AddressSearchInputProps {
  onPropertyFound?: (propertySlug: string) => void;
  variant?: "hero" | "compact";
  className?: string;
}

export function AddressSearchInput({
  onPropertyFound,
  variant = "hero",
  className = "",
}: AddressSearchInputProps) {
  const [streetNumber, setStreetNumber] = useState("");
  const [streetName, setStreetName] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSearch = useCallback(async () => {
    if (!streetNumber.trim() || !streetName.trim() || !city.trim()) {
      toast({
        title: "Adresse incomplète",
        description: "Veuillez entrer le numéro civique, la rue et la ville.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      const fullAddress = `${streetNumber} ${streetName}, ${city}, QC${postalCode ? ` ${postalCode}` : ""}`;

      // Check if property already exists
      const existing = await findPropertyByAddress(fullAddress);
      if (existing?.slug) {
        if (onPropertyFound) {
          onPropertyFound(existing.slug);
        } else {
          navigate(`/maison/${existing.slug}`);
        }
        return;
      }

      // Create new property if user is logged in
      if (user) {
        const { property } = await createProperty(
          {
            streetNumber: streetNumber.trim(),
            streetName: streetName.trim(),
            city: city.trim(),
            postalCode: postalCode.trim(),
            province: "QC",
          },
          user.id
        );
        if (property?.slug) {
          navigate(`/maison/${property.slug}`);
        }
      } else {
        // For anonymous users, redirect to signup with address context
        toast({
          title: "Créez votre compte",
          description: "Inscrivez-vous pour accéder au Passeport Maison de cette propriété.",
        });
        navigate("/signup");
      }
    } catch (err) {
      console.error("Address search error:", err);
      toast({
        title: "Erreur",
        description: "Impossible de rechercher cette adresse. Réessayez.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  }, [streetNumber, streetName, city, postalCode, user, navigate, toast, onPropertyFound]);

  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Entrez une adresse..."
            value={`${streetNumber} ${streetName}${city ? `, ${city}` : ""}`}
            onChange={(e) => {
              const v = e.target.value;
              setStreetName(v);
            }}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch} disabled={isSearching} size="sm">
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>
    );
  }

  return (
    <Card className={`border-border/50 shadow-[var(--shadow-lg)] ${className}`}>
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-5 w-5 text-primary" />
          <h3 className="font-display text-lg font-semibold text-foreground">
            Trouvez votre maison
          </h3>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="col-span-1">
            <Label htmlFor="streetNumber" className="text-xs text-muted-foreground">
              No civique
            </Label>
            <Input
              id="streetNumber"
              placeholder="123"
              value={streetNumber}
              onChange={(e) => setStreetNumber(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="col-span-3">
            <Label htmlFor="streetName" className="text-xs text-muted-foreground">
              Rue
            </Label>
            <Input
              id="streetName"
              placeholder="rue des Érables"
              value={streetName}
              onChange={(e) => setStreetName(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div>
            <Label htmlFor="city" className="text-xs text-muted-foreground">
              Ville
            </Label>
            <Input
              id="city"
              placeholder="Montréal"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="postalCode" className="text-xs text-muted-foreground">
              Code postal
            </Label>
            <Input
              id="postalCode"
              placeholder="H2X 1Y4"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <Button
          onClick={handleSearch}
          disabled={isSearching}
          className="w-full gap-2"
          size="lg"
        >
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Rechercher cette adresse
          <ArrowRight className="h-4 w-4 ml-auto" />
        </Button>
      </CardContent>
    </Card>
  );
}
