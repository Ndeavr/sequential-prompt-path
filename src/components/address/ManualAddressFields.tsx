/**
 * UNPRO — Manual address fields (no Google lookup).
 * Street, unit, city, postal code, province typed by the user.
 * The result is a DECLARED address: never shown as verified or geocoded.
 */
import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Info } from "lucide-react";
import {
  composeDeclaredAddress,
  isValidPostalCode,
  type DeclaredAddressParts,
  type UnverifiedAddressData,
  type VerifiedAddress,
} from "@/types/address";

interface Props {
  value: VerifiedAddress | null | undefined;
  onChange: (value: UnverifiedAddressData) => void;
  label?: string;
  required?: boolean;
  showUnitField?: boolean;
}

function initialParts(value: VerifiedAddress | null | undefined): DeclaredAddressParts {
  if (value && !value.verified && value.declared) return value.declared;
  if (value && value.verified) {
    return {
      street: [value.streetNumber, value.streetName].filter(Boolean).join(" ") || value.fullAddress,
      unit: value.unit, city: value.city, province: value.province || "QC", postalCode: value.postalCode,
    };
  }
  return { street: value && !value.verified ? value.raw : "", unit: "", city: "", province: "QC", postalCode: "" };
}

export default function ManualAddressFields({ value, onChange, label = "Adresse", required, showUnitField = true }: Props) {
  const id = useId();
  const [parts, setParts] = useState<DeclaredAddressParts>(() => initialParts(value));
  const [postalTouched, setPostalTouched] = useState(false);

  const update = (key: keyof DeclaredAddressParts) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = { ...parts, [key]: e.target.value };
    setParts(next);
    onChange({ verified: false, raw: composeDeclaredAddress(next), declared: next });
  };

  const postalInvalid = postalTouched && !isValidPostalCode(parts.postalCode);
  const field = "h-11 rounded-xl text-base";

  return (
    <fieldset className="space-y-3" data-address-mode="declared">
      {label && (
        <legend className="text-sm font-medium mb-1">
          {label} {required && <span className="text-destructive" aria-hidden>*</span>}
        </legend>
      )}
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-street`} className="text-xs text-muted-foreground">Numéro et rue</Label>
        <Input id={`${id}-street`} value={parts.street} onChange={update("street")} autoComplete="address-line1"
          placeholder="123, rue Principale" required={required} className={field} />
      </div>
      {showUnitField && (
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-unit`} className="text-xs text-muted-foreground">App. / unité (facultatif)</Label>
          <Input id={`${id}-unit`} value={parts.unit ?? ""} onChange={update("unit")} autoComplete="address-line2" className={field} />
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_8rem_5rem] gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-city`} className="text-xs text-muted-foreground">Ville</Label>
          <Input id={`${id}-city`} value={parts.city} onChange={update("city")} autoComplete="address-level2"
            placeholder="Montréal" required={required} className={field} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-postal`} className="text-xs text-muted-foreground">Code postal</Label>
          <Input id={`${id}-postal`} value={parts.postalCode} onChange={update("postalCode")} onBlur={() => setPostalTouched(true)}
            autoComplete="postal-code" placeholder="H2X 1Y4" maxLength={7} aria-invalid={postalInvalid}
            aria-describedby={postalInvalid ? `${id}-postal-err` : undefined} className={field} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-prov`} className="text-xs text-muted-foreground">Province</Label>
          <Input id={`${id}-prov`} value={parts.province} onChange={update("province")} autoComplete="address-level1"
            maxLength={2} className={field} />
        </div>
      </div>
      {postalInvalid && (
        <p id={`${id}-postal-err`} role="alert" className="text-xs text-destructive">Format attendu : H2X 1Y4.</p>
      )}
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden />
        <span>Adresse déclarée : elle sera confirmée plus tard, sans recherche automatique.</span>
      </p>
    </fieldset>
  );
}
