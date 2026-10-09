"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function SplashRedirect({ to, afterMs }: { to: string; afterMs: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setTimeout(() => router.replace(to), afterMs);
    return () => clearTimeout(id);
  }, [router, to, afterMs]);
  return null;
}
