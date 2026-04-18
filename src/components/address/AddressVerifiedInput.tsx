/**
 * UNPRO — AddressVerifiedInput
 * Single, mandatory-verification address capture used everywhere.
 * The user MUST select a Google Places suggestion. Free text is rejected.
 */
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAddressAutocomplete, type AddressPrediction } from "@/hooks/useAddressAutocomplete";
import type { VerifiedAddress, VerifiedAddressData } from "@/types/address";
import { emptyAddress, isVerified } from "@/types/address";

interface AddressVerifiedInputProps {
  value: VerifiedAddress | null | undefined;
  onChange: (value: VerifiedAddress) => void;
  label?: string;
  required?: boolean;
  showUnitField?: boolean;
  placeholder?: string;
  className?: string;
}

export default function AddressVerifiedInput({
  value,
  onChange,
  label = "Adresse",
  required,
  showUnitField = true,
  placeholder = "Tapez votre adresse…",
  className,
}: AddressVerifiedInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(() => {
    if (isVerified(value)) return value.fullAddress;
    return value?.raw || "";
  });
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [resolving, setResolving] = useState(false);

  const { predictions, isLoading, search, fetchDetails, reset } = useAddressAutocomplete();

  // Keep draft in sync if parent value changes externally (e.g. reset)
  useEffect(() => {
    if (isVerified(value)) {
      setDraft(value.fullAddress);
    } else if (value && value.raw !== draft) {
      setDraft(value.raw);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value && (isVerified(value) ? value.placeId : value.raw)]);

  // Close on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const verified = isVerified(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setDraft(v);
    // Any keystroke invalidates a previously verified address
    if (verified) {
      onChange({ verified: false, raw: v });
    } else {
      onChange({ verified: false, raw: v });
    }
    search(v);
    setIsOpen(true);
    setActiveIndex(-1);
  };

  const handleSelect = async (pred: AddressPrediction) => {
    setIsOpen(false);
    reset();
    setDraft(pred.description);
    setResolving(true);
    const details = await fetchDetails(pred.place_id);
    setResolving(false);
    if (details) {
      // Preserve unit if user already typed one
      const unit = isVerified(value) ? value.unit : undefined;
      onChange({ ...details, unit });
      setDraft(details.fullAddress);
    } else {
      onChange({ verified: false, raw: pred.description });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || predictions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(i => (i + 1) % predictions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(i => (i <= 0 ? predictions.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(predictions[activeIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleEdit = () => {
    onChange(emptyAddress());
    setDraft("");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleUnitChange = (unit: string) => {
    if (!isVerified(value)) return;
    onChange({ ...value, unit: unit || undefined });
  };

  return (
    <div ref={containerRef} className={cn("space-y-2", className)}>
      {label && (
        <Label className="text-sm font-medium">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}

      {verified ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">
                {value.fullAddress}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Adresse vérifiée
                {value.city && ` · ${value.city}`}
                {value.province && `, ${value.province}`}
                {value.postalCode && ` ${value.postalCode}`}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              className="text-xs h-7 px-2"
            >
              Modifier
            </Button>
          </div>
          {showUnitField && (
            <Input
              placeholder="App. / Unité (optionnel)"
              value={value.unit || ""}
              onChange={(e) => handleUnitChange(e.target.value)}
              className="h-9 text-sm rounded-lg"
            />
          )}
        </div>
      ) : (
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={draft}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => predictions.length > 0 && setIsOpen(true)}
            className="h-11 pl-9 pr-10 rounded-xl"
            autoComplete="off"
            aria-invalid={!!draft && !verified}
          />
          {(isLoading || resolving) && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
          )}
          {isOpen && predictions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-border/40 bg-popover shadow-lg overflow-hidden">
              <ul role="listbox" className="max-h-72 overflow-y-auto">
                {predictions.map((p, idx) => (
                  <li
                    key={p.place_id}
                    role="option"
                    aria-selected={idx === activeIndex}
                    onMouseDown={(e) => { e.preventDefault(); handleSelect(p); }}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={cn(
                      "px-3 py-2.5 cursor-pointer flex items-start gap-2 text-sm transition-colors",
                      idx === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                    )}
                  >
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">
                        {p.structured_formatting?.main_text || p.description}
                      </div>
                      {p.structured_formatting?.secondary_text && (
                        <div className="text-xs text-muted-foreground truncate">
                          {p.structured_formatting.secondary_text}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {draft && !verified && !isLoading && !resolving && predictions.length === 0 && (
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-amber-600">
              <AlertCircle className="h-3 w-3" />
              <span>Sélectionnez une adresse dans la liste pour la vérifier</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
