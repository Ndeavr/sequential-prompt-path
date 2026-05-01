/**
 * VaultButton — Primary CTA with full vault sequence.
 *
 *   idle → scanning → opening → success (vault-clack + match-success on confirm)
 *
 * Wraps MotionButton + useInteractionState. Pass `onAction` (async) — the button
 * will run the vault sequence around it.
 */
import { useEffect, type ReactNode } from "react";
import MotionButton, { type MotionButtonProps } from "./MotionButton";
import { useInteractionState } from "@/hooks/useInteractionState";
import { useUnproSound } from "@/hooks/useUnproSound";

export interface VaultButtonProps
  extends Omit<MotionButtonProps, "state" | "onClick" | "confirmSound"> {
  onAction?: () => void | Promise<void>;
  children?: ReactNode;
  /** Skip the success/opening sequence after the action resolves (e.g. for navigations) */
  fireAndForget?: boolean;
}

export default function VaultButton({
  onAction,
  fireAndForget,
  children,
  variant = "vault",
  ...rest
}: VaultButtonProps) {
  const { state, run, set } = useInteractionState();
  const { scanStart, vaultClack, matchSuccess, errorSoft } = useUnproSound();

  // Map state → sound transitions
  useEffect(() => {
    if (state === "scanning") scanStart();
    if (state === "opening") vaultClack();
    if (state === "success") matchSuccess();
    if (state === "error") errorSoft();
  }, [state, scanStart, vaultClack, matchSuccess, errorSoft]);

  const handle = async () => {
    if (!onAction) {
      vaultClack();
      return;
    }
    if (fireAndForget) {
      vaultClack();
      try {
        await onAction();
      } catch {
        set("error");
      }
      return;
    }
    await run(async () => {
      await onAction();
    });
  };

  // Map interaction state to MotionButton state
  const btnState =
    state === "scanning" ? "loading" : state === "success" ? "success" : state === "error" ? "error" : "idle";

  return (
    <MotionButton
      state={btnState}
      variant={variant}
      onClick={handle}
      {...rest}
    >
      {children}
    </MotionButton>
  );
}
