"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useSession } from "./useSession";

/**
 * Wraps the customer-only areas (tickets, bookings, profile, checkout). A visitor who isn't signed in is sent to the
 * log-in page and brought back here afterwards.
 */
export function RequireCustomer({ children }: { children: ReactNode }) {
  const { user, ready } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready || user) return;
    const next = pathname + window.location.search;
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [ready, user, pathname, router]);

  if (!ready || !user) {
    return (
      <div role="status" className="mx-auto flex max-w-site items-center justify-center gap-3 px-5 py-24 text-sm text-muted">
        <Loader2 size={16} aria-hidden className="animate-spin text-gold" />
        {ready ? "Taking you to log in…" : "Loading…"}
      </div>
    );
  }
  return <>{children}</>;
}
