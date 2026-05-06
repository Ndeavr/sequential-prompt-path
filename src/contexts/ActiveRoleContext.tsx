/**
 * UNPRO — Shared Active Role Context
 * Single source of truth for the user's active persona across all navigation components.
 */
import { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@/types/navigation";

const STORAGE_KEY = "unpro_active_role";

interface ActiveRoleContextValue {
  activeRole: UserRole | "guest";
  setActiveRole: (role: UserRole) => void;
  availableRoles: UserRole[];
}

const ActiveRoleCtx = createContext<ActiveRoleContextValue>({
  activeRole: "guest",
  setActiveRole: () => {},
  availableRoles: [],
});

export function ActiveRoleProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, role: dbRole } = useAuth();

  const availableRoles = useMemo<UserRole[]>(() => {
    if (!isAuthenticated) return [];
    const roles: UserRole[] = [];
    if (dbRole === "admin") roles.push("admin");
    if (dbRole === "contractor") roles.push("contractor");
    roles.push("homeowner");
    if (!roles.includes("partner")) roles.push("partner");
    return [...new Set(roles)];
  }, [isAuthenticated, dbRole]);

  const defaultRole = useMemo<UserRole>(() => {
    if (dbRole === "admin") return "admin";
    if (dbRole === "contractor") return "contractor";
    return "homeowner";
  }, [dbRole]);

  const [overrideRole, setOverrideRole] = useState<UserRole | null>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      return stored as UserRole | null;
    } catch {
      return null;
    }
  });

  const activeRole: UserRole | "guest" = !isAuthenticated
    ? "guest"
    : overrideRole && availableRoles.includes(overrideRole)
      ? overrideRole
      : defaultRole;

  const setActiveRole = useCallback((r: UserRole) => {
    setOverrideRole(r);
    try {
      sessionStorage.setItem(STORAGE_KEY, r);
    } catch {}
  }, []);

  // Clear override on logout
  useEffect(() => {
    if (!isAuthenticated) {
      setOverrideRole(null);
      try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
    }
  }, [isAuthenticated]);

  return (
    <ActiveRoleCtx.Provider value={{ activeRole, setActiveRole, availableRoles }}>
      {children}
    </ActiveRoleCtx.Provider>
  );
}

export const useActiveRole = () => useContext(ActiveRoleCtx);
