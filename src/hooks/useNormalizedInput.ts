/**
 * Generic normalized-input hook. Never rejects during typing; finalizes on blur.
 */
import { useCallback, useState } from "react";
import { normalizeInput, type NormalizableType, type NormalizeOptions } from "@/utils/normalizeInput";

export interface UseNormalizedInputResult {
  /** Raw value bound to the input. */
  value: string;
  /** Canonical value to save (post-normalization). */
  canonical: string;
  /** Pretty display of canonical value. */
  display: string;
  /** True only after blur and only if empty or invalid post-normalization. */
  error: string | null;
  valid: boolean;
  touched: boolean;
  onChange: (v: string) => void;
  onBlur: () => void;
  setValue: (v: string) => void;
  reset: () => void;
}

export function useNormalizedInput(
  initial: string,
  type: NormalizableType,
  opts?: NormalizeOptions
): UseNormalizedInputResult {
  const [value, setValue] = useState(initial);
  const [touched, setTouched] = useState(false);

  const res = normalizeInput(value, type, opts);

  const onChange = useCallback((v: string) => setValue(v), []);
  const onBlur = useCallback(() => {
    setTouched(true);
    // Snap to canonical on blur if non-empty + valid
    if (res.valid && res.value) setValue(res.display || res.value);
  }, [res.valid, res.value, res.display]);

  return {
    value,
    canonical: res.value,
    display: res.display,
    valid: res.valid,
    error: touched && value.trim() && !res.valid ? res.reason ?? "Valeur invalide." : null,
    touched,
    onChange,
    onBlur,
    setValue,
    reset: () => { setValue(initial); setTouched(false); },
  };
}
