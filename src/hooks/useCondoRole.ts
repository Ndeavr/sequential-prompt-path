/**
 * UNPRO — Condo Role Context
 * Manages condo_owner / condo_manager / condo_board roles within the condo app.
 */
import { createContext, useContext, useState, useCallback, useMemo } from "react";

export type CondoRole = "condo_owner" | "condo_manager" | "condo_board";

export interface CondoRoleContextType {
  condoRole: CondoRole;
  setCondoRole: (role: CondoRole) => void;
  isOwner: boolean;
  isManager: boolean;
  isBoard: boolean;
}

const CondoRoleContext = createContext<CondoRoleContextType | null>(null);

export const CondoRoleProvider = CondoRoleContext.Provider;

export function useCondoRole(): CondoRoleContextType {
  const ctx = useContext(CondoRoleContext);
  if (!ctx) {
    // Fallback for pages not wrapped — default to owner
    return {
      condoRole: "condo_owner",
      setCondoRole: () => {},
      isOwner: true,
      isManager: false,
      isBoard: false,
    };
  }
  return ctx;
}

export function useCondoRoleState(): CondoRoleContextType {
  const [condoRole, setCondoRoleRaw] = useState<CondoRole>(() => {
    try {
      return (localStorage.getItem("unpro_condo_role") as CondoRole) || "condo_owner";
    } catch { return "condo_owner"; }
  });

  const setCondoRole = useCallback((role: CondoRole) => {
    setCondoRoleRaw(role);
    try { localStorage.setItem("unpro_condo_role", role); } catch {}
  }, []);

  const value = useMemo<CondoRoleContextType>(() => ({
    condoRole,
    setCondoRole,
    isOwner: condoRole === "condo_owner",
    isManager: condoRole === "condo_manager",
    isBoard: condoRole === "condo_board",
  }), [condoRole, setCondoRole]);

  return value;
}
