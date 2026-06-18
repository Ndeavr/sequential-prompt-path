/**
 * useHomeAbTest — Deterministic 50/50 split for homepage variant test.
 * - Persists bucket per visitor in localStorage.
 * - Allows `?variant=a|b` override for QA.
 * - Logs assignment once per visitor to ab_test_assignments.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type HomeBucket = "a" | "b";
const TEST_KEY = "home_v1_vs_v2";
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

function assignBucket(): HomeBucket {
  const override = new URLSearchParams(window.location.search).get("variant");
  if (override === "a" || override === "b") return override;
  const existing = localStorage.getItem(BUCKET_KEY);
  if (existing === "a" || existing === "b") return existing as HomeBucket;
  const bucket: HomeBucket = Math.random() < 0.5 ? "a" : "b";
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
