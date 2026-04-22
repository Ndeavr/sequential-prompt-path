/**
 * PhoneInput — Auto-formatting phone input for Quebec/Canada.
 * Drop-in replacement for <Input type="tel" />.
 */
import { forwardRef, useCallback, useState } from "react";
import { Input } from "@/components/ui/input";
import { formatPhoneDisplay, formatPhoneFinal, phoneDigitsOnly } from "@/utils/formatPhone";
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

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatPhoneDisplay(e.target.value);
      onChange(formatted);
    }, [onChange]);

    const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      setTouched(true);
      const final = formatPhoneFinal(value);
      onChange(final);
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
