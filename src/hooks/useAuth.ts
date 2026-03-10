/**
 * UNPRO — useAuth Hook
 * Manages authentication state via TanStack Query.
 *
 * Future: session management, login, logout, signup, role checking.
 */

// import { useQuery } from "@tanstack/react-query";

export const useAuth = () => {
  // Placeholder until Lovable Cloud is enabled
  return {
    user: null,
    isLoading: false,
    isAuthenticated: false,
    role: null,
  };
};
