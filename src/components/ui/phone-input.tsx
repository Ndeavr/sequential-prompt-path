/**
 * PhoneInput — Champ téléphone canonique UNPRO.
 * Affichage : (514) 249-9522 · Valeur technique : +15142499522
 * Drop-in replacement for <Input type="tel" />.
 */
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { formatPhoneDisplay, formatPhoneFinal, phoneDigitsOnly, phoneToE164 } from "@/utils/formatPhone";
import { cn } from "@/lib/utils";

interface PhoneInputProps extends Omit<React.ComponentPropsWithoutRef<typeof Input>, "onChange" | "value" | "type"> {
  value: string;
  onChange: (formatted: string) => void;
  onNormalized?: (e164: string | null) => void;
  showValidation?: boolean;
}

const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, onNormalized, showValidation = false, className, onBlur, ...props }, ref) => {
    const [touched, setTouched] = useState(false);
    const digits = phoneDigitsOnly(value);
    const isComplete = digits.length === 10;
    const showError = showValidation && touched && digits.length > 0 && !isComplete;

    // Reformate automatiquement une valeur préchargée (ex. "15142499522").
    const lastEmitted = useRef<string | null>(null);
    useEffect(() => {
      const pretty = formatPhoneDisplay(value);
      if (value && pretty !== value && lastEmitted.current !== pretty) {
        lastEmitted.current = pretty;
        onChange(pretty);
      }
    }, [value, onChange]);

    // Expose la valeur E.164 au parent à chaque changement.
    useEffect(() => {
      onNormalized?.(phoneToE164(value));
    }, [value, onNormalized]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(formatPhoneDisplay(e.target.value));
    }, [onChange]);

    const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      setTouched(true);
      onChange(formatPhoneFinal(value));
      onBlur?.(e);
    }, [value, onChange, onBlur]);

    return (
      <div className="space-y-1">
        <Input
          ref={ref}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          className={cn(
            showError && "border-destructive/50 focus:ring-destructive/30",
            className
          )}
          {...props}
        />
        {showError && (
          <p className="text-xs text-destructive/80">Veuillez entrer un numéro valide.</p>
        )}
      </div>
    );
  }
);
PhoneInput.displayName = "PhoneInput";
export { PhoneInput };
