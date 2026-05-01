/**
 * MatchButton — CTA tuned for matching/recommendation actions.
 *   idle → matching → matched (double clack)
 */
import { useEffect, type ReactNode } from "react";
import MotionButton, { type MotionButtonProps } from "./MotionButton";
import { useInteractionState } from "@/hooks/useInteractionState";
import { useUnproSound } from "@/hooks/useUnproSound";

export interface MatchButtonProps
  extends Omit<MotionButtonProps, "state" | "onClick" | "confirmSound"> {
  onAction?: () => void | Promise<void>;
  children?: ReactNode;
}

export default function MatchButton({
  onAction,
  children,
  ...rest
}: MatchButtonProps) {
  const { state, run } = useInteractionState();
  const { criteriaClick, vaultClack, matchSuccess, errorSoft } = useUnproSound();

  useEffect(() => {
    if (state === "scanning") criteriaClick();
    if (state === "opening") {
      vaultClack();
      window.setTimeout(() => vaultClack(), 120); // double clack
    }
    if (state === "success") matchSuccess();
    if (state === "error") errorSoft();
  }, [state, criteriaClick, vaultClack, matchSuccess, errorSoft]);

  const handle = async () => {
    if (!onAction) return;
    await run(async () => {
      await onAction();
    });
  };

  const btnState =
    state === "scanning" ? "loading" : state === "success" ? "success" : state === "error" ? "error" : "idle";

  return (
    <MotionButton state={btnState} onClick={handle} {...rest}>
      {children}
    </MotionButton>
  );
}
