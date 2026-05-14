/**
 * UNPRO — Shared Active Role Context
 * Single source of truth for the user's active persona across all navigation components.
 *
 * Now also acts as the **site-wide UI mode**: contractor landings (e.g. /entrepreneur)
 * can call `setActiveRole("contractor")` even for guests, and the entire site
 * (hero, bottom nav, quick actions, voice greeting) adapts. Persisted in
 * localStorage so it survives reloads and cross-tab.
 */
import { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@/types/navigation";

const STORAGE_KEY = "unpro_active_role";

// Roles a guest is allowed to self-select (UI mode only — never grants real perms).
const GUEST_SELECTABLE: UserRole[] = ["homeowner", "contractor"];

interface ActiveRoleContextValue {
  activeRole: UserRole | "guest";
  setActiveRole: (role: UserRole) => void;
  clearActiveRole: () => void;
  availableRoles: UserRole[];
}

const ActiveRoleCtx = createContext<ActiveRoleContextValue>({
  activeRole: "guest",
  setActiveRole: () => {},
  clearActiveRole: () => {},
  availableRoles: [],
});

function readStoredRole(): UserRole | null {
  try {
    const ls = localStorage.getItem(STORAGE_KEY);
    if (ls) return ls as UserRole;
    const ss = sessionStorage.getItem(STORAGE_KEY);
    return (ss as UserRole | null) ?? null;
  } catch {
    return null;
  }
}

function writeStoredRole(r: UserRole) {
  try {
    localStorage.setItem(STORAGE_KEY, r);
    sessionStorage.setItem(STORAGE_KEY, r);
  } catch {}
}

function clearStoredRole() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
}

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

  const [overrideRole, setOverrideRole] = useState<UserRole | null>(() => readStoredRole());

  // Cross-tab sync via storage events
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setOverrideRole((e.newValue as UserRole | null) ?? null);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // If user is admin but override is a lower role, clear it so admin functions reappear.
  useEffect(() => {
    if (isAuthenticated && allRoles.includes("admin") && overrideRole && overrideRole !== "admin") {
      if (overrideRole === "homeowner") {
        setOverrideRole(null);
        clearStoredRole();
      }
    }
  }, [isAuthenticated, allRoles.join(","), overrideRole]);

  const activeRole: UserRole | "guest" = !isAuthenticated
    ? // Guest: honor self-selected UI mode (contractor/homeowner) — UI only, no real perms.
      (overrideRole && GUEST_SELECTABLE.includes(overrideRole) ? overrideRole : "guest")
    : overrideRole && availableRoles.includes(overrideRole)
      ? overrideRole
      : defaultRole;

  const setActiveRole = useCallback((r: UserRole) => {
    setOverrideRole(r);
    writeStoredRole(r);
  }, []);

  const clearActiveRole = useCallback(() => {
    setOverrideRole(null);
    clearStoredRole();
  }, []);

  // Clear override on logout
  useEffect(() => {
    if (!isAuthenticated) {
      // Keep guest-selected mode (contractor/homeowner) — only clear privileged roles.
      if (overrideRole && !GUEST_SELECTABLE.includes(overrideRole)) {
        setOverrideRole(null);
        clearStoredRole();
      }
    }
  }, [isAuthenticated]);

  return (
    <ActiveRoleCtx.Provider value={{ activeRole, setActiveRole, clearActiveRole, availableRoles }}>
      {children}
    </ActiveRoleCtx.Provider>
  );
}

export const useActiveRole = () => useContext(ActiveRoleCtx);
