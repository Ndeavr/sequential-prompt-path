/**
 * WebsiteInput — Auto-cleaning website/URL input.
 * Drop-in replacement for <Input type="url" />.
 */
import { forwardRef, useCallback, useState } from "react";
import { Input } from "@/components/ui/input";
import { formatWebsiteDisplay, isValidWebsite } from "@/utils/formatWebsite";
import { cleanInput } from "@/utils/cleanInput";
import { cn } from "@/lib/utils";

interface WebsiteInputProps extends Omit<React.ComponentPropsWithoutRef<typeof Input>, "onChange" | "value" | "type"> {
  value: string;
  onChange: (cleaned: string) => void;
  showValidation?: boolean;
}

const WebsiteInput = forwardRef<HTMLInputElement, WebsiteInputProps>(
  ({ value, onChange, showValidation = false, className, onBlur, ...props }, ref) => {
    const [touched, setTouched] = useState(false);
    const showError = showValidation && touched && value.trim().length > 0 && !isValidWebsite(value);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    }, [onChange]);

    const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      setTouched(true);
      const cleaned = cleanInput(value);
      onChange(cleaned);
      onBlur?.(e);
    }, [value, onChange, onBlur]);

    return (
      <div className="space-y-1">
        <Input
          ref={ref}
          type="text"
          inputMode="url"
          autoComplete="url"
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
          <p className="text-xs text-destructive/80">Veuillez entrer un site web valide.</p>
        )}
      </div>
    );
  }
);
WebsiteInput.displayName = "WebsiteInput";
export { WebsiteInput };
