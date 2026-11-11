"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { useSession, type Role } from "./useSession";

/**
 * Wraps the organizer and admin portals. A visitor is sent to log in and brought back; a signed-in account without the
 * role sees a short "no access" page. This only decides what to show: every request these pages make is checked
 * again by the server, which is what actually protects the data.
 */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user, ready } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready || user) return;
    router.replace(`/login?next=${encodeURIComponent(pathname + window.location.search)}`);
  }, [ready, user, pathname, router]);

  if (!ready || !user) {
    return (
      <div role="status" className="flex min-h-screen items-center justify-center gap-3 bg-page px-5 text-sm text-muted">
        <Loader2 size={16} aria-hidden className="animate-spin text-gold" />
        {ready ? "Taking you to log in…" : "Loading…"}
      </div>
    );
  }
  if (!user.roles.includes(role)) {
    const where = role === "admin" ? "the admin portal" : "the organizer portal";
    return (
      <main className="flex min-h-screen items-center justify-center bg-page px-5">
        <div className="max-w-sm text-center">
          <ShieldAlert size={28} aria-hidden className="mx-auto text-amber" />
          <h1 className="mt-4 text-xl font-bold text-text">No access to {where}</h1>
          <p className="mt-2 text-sm text-muted">
            You&apos;re signed in as {user.email}, which doesn&apos;t have access here.
            {role === "organizer" ? " To sell tickets for your events, apply to become an organizer." : ""}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <LinkButton href="/">Go to the website</LinkButton>
            {role === "organizer" && (
              <LinkButton href="/become-an-organizer" variant="outline" className="border-line text-text hover:bg-surface-2">
                Become an organizer
              </LinkButton>
            )}
          </div>
        </div>
      </main>
    );
  }
  return <>{children}</>;
}
