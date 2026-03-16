/**
 * UNPRO — ScrollRestoration Component
 * Drop into router to handle all scroll behavior globally.
 */

import { useScrollRestoration } from "@/hooks/useScrollRestoration";

const ScrollRestoration = () => {
  useScrollRestoration();
  return null;
};

export default ScrollRestoration;
