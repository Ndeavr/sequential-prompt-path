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
  const { isAuthenticated, role: dbRole, roles: dbRoles } = useAuth() as any;
  const allRoles: string[] = Array.isArray(dbRoles) ? dbRoles : (dbRole ? [dbRole] : []);

  const availableRoles = useMemo<UserRole[]>(() => {
    if (!isAuthenticated) return [];
    const roles: UserRole[] = [];
    if (allRoles.includes("admin")) roles.push("admin");
    if (allRoles.includes("contractor")) roles.push("contractor");
    roles.push("homeowner");
    if (!roles.includes("partner")) roles.push("partner");
    return [...new Set(roles)];
  }, [isAuthenticated, allRoles.join(",")]);

  const defaultRole = useMemo<UserRole>(() => {
    if (allRoles.includes("admin")) return "admin";
    if (allRoles.includes("contractor")) return "contractor";
    return "homeowner";
  }, [allRoles.join(",")]);

  const [overrideRole, setOverrideRole] = useState<UserRole | null>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      return stored as UserRole | null;
    } catch {
      return null;
    }
  });

  // If user is admin but override is a lower role, clear it so admin functions reappear.
  useEffect(() => {
    if (isAuthenticated && allRoles.includes("admin") && overrideRole && overrideRole !== "admin") {
      // Only clear if user never explicitly chose to switch this session.
      // Heuristic: if overrideRole is "homeowner" and admin available, prefer admin on fresh load.
      // Keep override only if it matches an actually-held role other than homeowner default.
      if (overrideRole === "homeowner") {
        setOverrideRole(null);
        try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
      }
    }
  }, [isAuthenticated, allRoles.join(","), overrideRole]);

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
