"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Set once the splash has been shown in this browser tab, so it appears at the start of a visit and not on every page. */
export const SPLASH_SEEN_KEY = "sl-events:splash-seen";

/**
 * Put on the home page: the first time someone lands there in a visit, they go through the splash screen, which sends
 * them back here. Storage can be blocked (private windows), in which case the splash is simply skipped.
 */
export function SplashGate() {
  const router = useRouter();
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(SPLASH_SEEN_KEY)) return;
    } catch {
      return;
    }
    router.replace("/splash");
  }, [router]);
  return null;
}
