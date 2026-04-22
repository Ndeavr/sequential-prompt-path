/**
 * EmailInput — Auto-cleaning email input.
 * Drop-in replacement for <Input type="email" />.
 */
import { forwardRef, useCallback, useState } from "react";
import { Input } from "@/components/ui/input";
import { formatEmail, isValidEmail } from "@/utils/formatEmail";
import { cn } from "@/lib/utils";

interface EmailInputProps extends Omit<React.ComponentPropsWithoutRef<typeof Input>, "onChange" | "value" | "type"> {
  value: string;
  onChange: (cleaned: string) => void;
  showValidation?: boolean;
}

const EmailInput = forwardRef<HTMLInputElement, EmailInputProps>(
  ({ value, onChange, showValidation = false, className, onBlur, ...props }, ref) => {
    const [touched, setTouched] = useState(false);
    const showError = showValidation && touched && value.trim().length > 0 && !isValidEmail(value);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    }, [onChange]);

    const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      setTouched(true);
      onChange(formatEmail(value));
      onBlur?.(e);
    }, [value, onChange, onBlur]);

    return (
      <div className="space-y-1">
        <Input
          ref={ref}
          type="email"
          inputMode="email"
          autoComplete="email"
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
          <p className="text-xs text-destructive/80">Veuillez entrer un courriel valide.</p>
        )}
      </div>
    );
  }
);
EmailInput.displayName = "EmailInput";
export { EmailInput };
