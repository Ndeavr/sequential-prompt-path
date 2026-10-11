/**
 * UNPRO — AddressVerifiedInput
 * Single, mandatory-verification address capture used everywhere.
 * The user MUST select a Google Places suggestion. Free text is rejected.
 */
import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { MapPin, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAddressAutocomplete, type AddressPrediction } from "@/hooks/useAddressAutocomplete";
import type { VerifiedAddress } from "@/types/address";
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
  const inputId = useId();
  const listId = `${inputId}-predictions`;
  const selectionRef = useRef(0);
  const [draft, setDraft] = useState(() => {
    if (isVerified(value)) return value.fullAddress;
    return value?.raw || "";
  });
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [resolving, setResolving] = useState(false);

  const { predictions, isLoading, error: serviceError, search, fetchDetails, reset } = useAddressAutocomplete();
  const [manualMode, setManualMode] = useState(false);

  // Keep draft in sync if parent value changes externally (e.g. reset)
  useEffect(() => {
    if (isVerified(value)) {
      setDraft(value.fullAddress);
    } else if (value && value.raw !== draft) {
      setDraft(value.raw);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value && (isVerified(value) ? value.placeId : value.raw)]);

  useEffect(() => () => { selectionRef.current += 1; }, []);

  const verified = isVerified(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    selectionRef.current += 1;
    setResolving(false);
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
    const selection = ++selectionRef.current;
    setIsOpen(false);
    reset();
    setDraft(pred.description);
    setResolving(true);
    const details = await fetchDetails(pred.place_id);
    if (selection !== selectionRef.current) return;
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
    if (e.key === "Escape") { setIsOpen(false); return; }
    if (e.key === "Enter") e.preventDefault();
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
        <Label htmlFor={inputId} className="text-sm font-medium">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}

      {verified ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
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
        <Popover open={isOpen && predictions.length > 0} onOpenChange={setIsOpen}>
        <div className="relative">
          <PopoverAnchor asChild><div>
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
          <Input
            ref={inputRef}
            id={inputId}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={isOpen && predictions.length > 0}
            aria-controls={listId}
            aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
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
          </div></PopoverAnchor>
          {(isLoading || resolving) && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
          )}
          {isOpen && predictions.length > 0 && (
            <PopoverContent
              align="start" sideOffset={6} collisionPadding={8}
              className="address-predictions p-0"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
              onInteractOutside={(e) => { if (e.target === inputRef.current) e.preventDefault(); }}
            >
              <ul id={listId} role="listbox" aria-label="Adresses suggérées" className="overflow-y-auto overscroll-contain">
                {predictions.map((p, idx) => (
                  <li
                    key={p.place_id}
                    id={`${listId}-${idx}`}
                    role="option"
                    aria-selected={idx === activeIndex}
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => void handleSelect(p)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={cn(
                      "min-h-11 px-3 py-2.5 cursor-pointer flex items-start gap-2 text-sm transition-colors",
                      idx === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                    )}
                  >
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium break-words">
                        {p.structured_formatting?.main_text || p.description}
                      </div>
                      {p.structured_formatting?.secondary_text && (
                        <div className="text-xs text-muted-foreground break-words">
                          {p.structured_formatting.secondary_text}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <p className="px-3 py-1 text-xs text-muted-foreground">Google Maps</p>
            </PopoverContent>
          )}
          {serviceError && (
            <div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 space-y-1.5">
              <div className="flex items-start gap-1.5 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="font-medium">Service d'adresse temporairement indisponible</div>
                  <div className="text-xs mt-0.5">Conservez votre adresse à confirmer ou réessayez.</div>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs w-full"
                onClick={() => {
                  setManualMode(true);
                  // Mark address as manually entered (unverified) so submit logic can decide
                  onChange({ verified: false, raw: draft });
                }}
              >
                Saisir manuellement
              </Button>
            </div>
          )}
          {manualMode && !verified && (
            <div className="mt-1.5 text-[11px] text-muted-foreground">
              Mode manuel activé — l'adresse ne sera pas vérifiée par Google.
            </div>
          )}
          {!serviceError && draft && !verified && !isLoading && !resolving && predictions.length === 0 && (
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
              <AlertCircle className="h-3 w-3" />
              <span>Aucune suggestion affichée. Précisez la ville; l'adresse reste à confirmer.</span>
            </div>
          )}
        </div>
        </Popover>
      )}
    </div>
  );
}
