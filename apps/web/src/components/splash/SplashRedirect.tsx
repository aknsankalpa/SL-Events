"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SPLASH_SEEN_KEY } from "./SplashGate";

export function SplashRedirect({ to, afterMs }: { to: string; afterMs: number }) {
  const router = useRouter();
  useEffect(() => {
    // Remember that this visit has had its splash, so the home page does not send them back here.
    try {
      window.sessionStorage.setItem(SPLASH_SEEN_KEY, "1");
    } catch {
      /* storage blocked: the gate skips the splash in that case anyway */
    }
    const id = setTimeout(() => router.replace(to), afterMs);
    return () => clearTimeout(id);
  }, [router, to, afterMs]);
  return null;
}
