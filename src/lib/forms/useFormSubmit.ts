import { useCallback, useRef, useState } from 'react';
import type { FormPayloadBase, FormSubmitState, FormType, SubmitResult } from './types';
import { submitForm, FormValidationError } from './submitForm';

interface UseFormSubmitOptions {
  formType: FormType;
  validate?: (data: FormPayloadBase) => string | null;
  onSuccess?: (result: SubmitResult) => void;
}

export function useFormSubmit({ formType, validate, onSuccess }: UseFormSubmitOptions) {
  const [state, setState] = useState<FormSubmitState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const inFlight = useRef(false);
  const lastDataRef = useRef<FormPayloadBase | null>(null);

  const run = useCallback(async (data: FormPayloadBase) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setState('submitting');
    setError(null);
    lastDataRef.current = data;

    try {
      if (validate) {
        const v = validate(data);
        if (v) throw new FormValidationError(v);
      }
      const r = await submitForm(formType, data);
      setResult(r);
      setState('success');
      onSuccess?.(r);
    } catch (e: any) {
      setError(e?.message || 'Une erreur est survenue.');
      setState('error');
    } finally {
      inFlight.current = false;
    }
  }, [formType, validate, onSuccess]);

  const retry = useCallback(() => {
    if (lastDataRef.current) run(lastDataRef.current);
  }, [run]);

  const reset = useCallback(() => {
    setState('idle'); setError(null); setResult(null); lastDataRef.current = null;
  }, []);

  return {
    submit: run,
    retry,
    reset,
    state,
    error,
    result,
    isSubmitting: state === 'submitting',
    isSuccess: state === 'success',
    isError: state === 'error',
  };
}
