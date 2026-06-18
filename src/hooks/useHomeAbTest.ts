/**
 * useHomeAbTest — Deterministic 33/33/33 split for homepage variant test (A/B/C).
 * - Persists bucket per visitor in localStorage.
 * - Allows `?variant=a|b|c` override for QA.
 * - Logs assignment once per visitor to ab_test_assignments.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type HomeBucket = "a" | "b" | "c";
const TEST_KEY = "home_v1_v2_v3";
const BUCKET_KEY = "unpro_home_ab";
const VISITOR_KEY = "unpro_visitor_id";
const LOGGED_KEY = "unpro_home_ab_logged";

function getVisitorId(): string {
  let v = localStorage.getItem(VISITOR_KEY);
  if (!v) {
    v = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, v);
  }
  return v;
}

function isBucket(v: string | null): v is HomeBucket {
  return v === "a" || v === "b" || v === "c";
}

function assignBucket(): HomeBucket {
  const override = new URLSearchParams(window.location.search).get("variant");
  if (isBucket(override)) return override;
  const existing = localStorage.getItem(BUCKET_KEY);
  if (isBucket(existing)) return existing;
  const r = Math.random();
  const bucket: HomeBucket = r < 1 / 3 ? "a" : r < 2 / 3 ? "b" : "c";
  localStorage.setItem(BUCKET_KEY, bucket);
  return bucket;
}

export function useHomeAbTest(): HomeBucket | null {
  const [bucket, setBucket] = useState<HomeBucket | null>(null);

  useEffect(() => {
    const b = assignBucket();
    setBucket(b);

    const loggedKey = `${LOGGED_KEY}_${b}`;
    if (sessionStorage.getItem(loggedKey)) return;
    sessionStorage.setItem(loggedKey, "1");

    supabase
      .from("ab_test_assignments")
      .insert({
        test_key: TEST_KEY,
        bucket: b,
        visitor_id: getVisitorId(),
        path: window.location.pathname,
        user_agent: navigator.userAgent.slice(0, 240),
      })
      .then(() => {})
      .then(undefined, () => {});
  }, []);

  return bucket;
}
