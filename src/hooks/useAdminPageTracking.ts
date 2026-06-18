/**
 * UNPRO — Admin Page Visit Tracking
 * Fires on every /admin/* pathname change.
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useAdminPageTracking() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id || !pathname.startsWith("/admin")) return;
    const t = setTimeout(() => {
      supabase
        .from("admin_page_visits")
        .insert({ admin_user_id: user.id, path: pathname })
        .then(() => { /* swallow */ });
    }, 500);
    return () => clearTimeout(t);
  }, [pathname, user?.id]);
}
