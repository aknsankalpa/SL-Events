"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, ChevronDown, LogOut, Menu, X } from "lucide-react";
import { useSession } from "@/components/auth/useSession";
import { useNotifications } from "@/components/notifications/useNotifications";
import { LinkButton } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { signOut } from "@/lib/session";

type NavItem = { href: string; label: string; match: string[] };

const home: NavItem = { href: "/", label: "Home", match: ["/"] };
// The booking steps after ticket selection live under /bookings but belong to "Events".
const events: NavItem = { href: "/events", label: "Events", match: ["/events", "/bookings"] };
const help: NavItem = { href: "/help", label: "Help", match: ["/help", "/faq", "/contact", "/payment-instructions"] };

/** What a visitor who isn't signed in sees. */
const publicNav: NavItem[] = [
  home,
  events,
  { href: "/become-an-organizer", label: "Become an organizer", match: ["/become-an-organizer"] },
  { href: "/about", label: "About", match: ["/about"] },
  help,
];

/** What a signed-in customer sees. */
const customerNav: NavItem[] = [home, events, { href: "/my-tickets", label: "My tickets", match: ["/my-tickets"] }, help];

function isActive(pathname: string, match: string[]) {
  return match.some((m) => (m === "/" ? pathname === "/" : pathname.startsWith(m)));
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, ready } = useSession();
  const { unread } = useNotifications();
  const [open, setOpen] = useState(false);
  const nav = user ? customerNav : publicNav;

  function logOut() {
    signOut();
    setOpen(false);
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-page/95 backdrop-blur">
      <div className="mx-auto flex h-[88px] max-w-site items-center justify-between gap-6 px-5">
        <div className="flex items-center gap-10 xl:gap-12">
          <Logo height={60} priority />
          <nav aria-label="Main" className="hidden items-center gap-6 md:flex xl:gap-8">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(pathname, item.match) ? "page" : undefined}
                className={`whitespace-nowrap text-sm font-bold transition-colors hover:text-gold ${
                  isActive(pathname, item.match) ? "text-gold" : "text-muted"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {ready && user && (
            <>
              <Link
                href="/notifications"
                aria-label="Notifications"
                className="relative rounded-full p-2 text-muted transition-colors hover:text-gold"
              >
                <Bell size={20} />
                {unread > 0 && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-danger" />}
                {unread > 0 && <span className="sr-only">{unread} unread</span>}
              </Link>

              <Link
                href="/profile"
                className="hidden items-center gap-3 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-surface sm:flex"
              >
                <span className="flex size-10 items-center justify-center rounded-full border border-gold/60 bg-surface text-[13px] font-bold text-gold">
                  {user.initials}
                </span>
                <span className="max-w-[11rem] leading-tight">
                  <span className="block truncate text-[13px] font-bold text-text">{user.name}</span>
                  <span className="block truncate text-xs text-dim">{user.email}</span>
                </span>
                <ChevronDown size={14} className="text-muted" aria-hidden />
              </Link>

              <button
                type="button"
                onClick={logOut}
                aria-label="Log out"
                title="Log out"
                className="hidden rounded-lg p-2 text-muted transition-colors hover:text-danger sm:block"
              >
                <LogOut size={18} />
              </button>
            </>
          )}

          {ready && !user && (
            <div className="hidden items-center gap-2 sm:flex">
              <Link href="/login" className="rounded-lg px-4 py-2.5 text-sm font-bold text-text transition-colors hover:text-gold">
                Log in
              </Link>
              <LinkButton href="/register" size="sm">
                Create account
              </LinkButton>
            </div>
          )}

          <button
            type="button"
            className="rounded-lg p-2 text-text md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {open && (
        <nav aria-label="Mobile" className="border-t border-line bg-page px-5 py-4 md:hidden">
          <ul className="flex flex-col gap-1">
            {(user
              ? [...nav, { href: "/profile", label: "Profile", match: ["/profile", "/booking-history", "/notifications"] }]
              : nav
            ).map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`block rounded-lg px-3 py-3 text-sm font-bold ${
                    isActive(pathname, item.match) ? "bg-surface text-gold" : "text-muted"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="mt-2 border-t border-line pt-3">
              {user ? (
                <button type="button" onClick={logOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-3 text-sm font-bold text-danger">
                  <LogOut size={16} aria-hidden /> Log out
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <LinkButton href="/login" variant="outline" size="md" onClick={() => setOpen(false)}>
                    Log in
                  </LinkButton>
                  <LinkButton href="/register" size="md" onClick={() => setOpen(false)}>
                    Create account
                  </LinkButton>
                </div>
              )}
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
