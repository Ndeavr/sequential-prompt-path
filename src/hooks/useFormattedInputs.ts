/**
 * Reusable hooks for formatted/validated inputs.
 */
import { useState, useCallback, useRef } from "react";
import { formatPhoneDisplay, formatPhoneFinal, phoneDigitsOnly } from "@/utils/formatPhone";
import { formatEmail } from "@/utils/formatEmail";
import { formatWebsiteDisplay } from "@/utils/formatWebsite";
import { cleanInput, cleanTextField } from "@/utils/cleanInput";

type ValidationState = "neutral" | "valid" | "invalid";

/**
 * Hook for phone input with auto-formatting.
 */
export function useFormattedPhoneInput(initial = "") {
  const [raw, setRaw] = useState(initial);
  const [validation, setValidation] = useState<ValidationState>("neutral");

  const onChange = useCallback((value: string) => {
    const formatted = formatPhoneDisplay(value);
    setRaw(formatted);
    setValidation("neutral");
  }, []);

  const onBlur = useCallback(() => {
    const final = formatPhoneFinal(raw);
    setRaw(final);
    const digits = phoneDigitsOnly(raw);
    setValidation(digits.length === 0 ? "neutral" : digits.length === 10 ? "valid" : "invalid");
  }, [raw]);

  return { value: raw, onChange, onBlur, validation, setValue: setRaw };
}

/**
 * Hook for any normalized text field (name, company, city, etc.)
 */
export function useNormalizedField(initial = "") {
  const [value, setValue] = useState(initial);

  const onChange = useCallback((raw: string) => {
    setValue(raw);
  }, []);

  const onBlur = useCallback(() => {
    setValue((v) => cleanTextField(v));
  }, []);

  return { value, onChange, onBlur, setValue };
}

/**
 * Hook for soft validation — validates after pause or blur, never during typing.
 */
export function useSoftValidation(
  validator: (value: string) => boolean,
  delay = 800
) {
  const [state, setState] = useState<ValidationState>("neutral");
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const onChangeValidation = useCallback(() => {
    setState("neutral");
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const onBlurValidation = useCallback((value: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!value.trim()) {
      setState("neutral");
      return;
    }
    setState(validator(value) ? "valid" : "invalid");
  }, [validator]);

  return { validationState: state, onChangeValidation, onBlurValidation };
}
