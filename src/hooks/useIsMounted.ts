import { useEffect, useState } from "react";

/**
 * useIsMounted — returns true after first commit.
 * Use to gate access to window/document/localStorage in render paths.
 */
export function useIsMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}
