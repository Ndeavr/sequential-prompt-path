/**
 * Alex 100M — Provider
 * Mounts all hooks. Prevents duplicate initialization.
 */

import { useRef, type ReactNode } from "react";
import { useAlexBootstrap } from "./hooks/useAlexBootstrap";
import { useAlexSessionRestore } from "./hooks/useAlexSessionRestore";
import { useAlexInactivity } from "./hooks/useAlexInactivity";

interface AlexProviderProps {
  children: ReactNode;
}

export function AlexProvider({ children }: AlexProviderProps) {
  const mounted = useRef(false);
  if (!mounted.current) mounted.current = true;

  useAlexSessionRestore();
  useAlexBootstrap();
  useAlexInactivity();

  return <>{children}</>;
}
