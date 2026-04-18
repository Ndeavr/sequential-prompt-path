/**
 * UNPRO — Quick Property Add Form (homeowner onboarding step 2)
 * Address must be verified through Google Places.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import AddressVerifiedInput from "@/components/address/AddressVerifiedInput";
import { emptyAddress, isVerified, type VerifiedAddress } from "@/types/address";

const PROPERTY_TYPES = [
  { value: "maison", label: "Maison" },
  { value: "condo", label: "Condo" },
  { value: "duplex", label: "Duplex" },
  { value: "triplex", label: "Triplex" },
  { value: "multilogement", label: "Multilogement" },
  { value: "chalet", label: "Chalet" },
  { value: "commercial", label: "Commercial" },
];

interface FormPropertyQuickAddProps {
  onSave: (data: {
    address_line_1: string;
    city: string;
    postal_code: string;
    property_type: string;
  }) => void;
  loading?: boolean;
}

export default function FormPropertyQuickAdd({ onSave, loading }: FormPropertyQuickAddProps) {
  const [address, setAddress] = useState<VerifiedAddress>(emptyAddress());
  const [propertyType, setPropertyType] = useState("");

  const isValid = isVerified(address) && propertyType;

  const handleSubmit = () => {
    if (!isVerified(address)) return;
    const line1 = address.unit
      ? `${address.streetNumber} ${address.streetName}, app. ${address.unit}`
      : `${address.streetNumber} ${address.streetName}`.trim() || address.fullAddress;
    onSave({
      address_line_1: line1,
      city: address.city,
      postal_code: address.postalCode,
      property_type: propertyType,
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground">Votre propriété</h2>
        <p className="text-sm text-muted-foreground mt-1">Recherchez votre adresse pour commencer</p>
      </div>

      <div className="space-y-4">
        <AddressVerifiedInput
          value={address}
          onChange={setAddress}
          label="Adresse"
          required
        />

        <div className="grid grid-cols-2 gap-2">
          {PROPERTY_TYPES.map((pt) => (
            <button
              key={pt.value}
              type="button"
              onClick={() => setPropertyType(pt.value)}
              className={`p-3 rounded-xl text-sm font-medium border transition-all ${
                propertyType === pt.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:border-primary/30"
              }`}
            >
              {pt.label}
            </button>
          ))}
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!isValid || loading}
        className="w-full h-11 rounded-xl"
      >
        {loading ? "Enregistrement…" : "Continuer"}
      </Button>
    </div>
  );
}
