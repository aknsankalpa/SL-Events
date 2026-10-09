"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Bell, ChevronDown, Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { currentUser } from "@/lib/data";

const nav = [
  { href: "/", label: "Home", match: ["/"] },
  // The booking steps after ticket selection live under /bookings but belong to "Events".
  { href: "/events", label: "Events", match: ["/events", "/bookings"] },
  { href: "/my-tickets", label: "My tickets", match: ["/my-tickets"] },
  { href: "/help", label: "Help", match: ["/help"] },
];

function isActive(pathname: string, match: string[]) {
  return match.some((m) => (m === "/" ? pathname === "/" : pathname.startsWith(m)));
}

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-page/95 backdrop-blur">
      <div className="mx-auto flex h-[88px] max-w-site items-center justify-between gap-6 px-5">
        <div className="flex items-center gap-12">
          <Logo height={60} priority />
          <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(pathname, item.match) ? "page" : undefined}
                className={`text-sm font-bold transition-colors hover:text-gold ${
                  isActive(pathname, item.match) ? "text-gold" : "text-muted"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/notifications"
            aria-label="Notifications"
            className="relative rounded-full p-2 text-muted transition-colors hover:text-gold"
          >
            <Bell size={20} />
            <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-danger" />
          </Link>

          <Link
            href="/profile"
            className="hidden items-center gap-3 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-surface sm:flex"
          >
            <span className="flex size-10 items-center justify-center rounded-full border border-gold/60 bg-surface text-[13px] font-bold text-gold">
              {currentUser.initials}
            </span>
            <span className="leading-tight">
              <span className="block text-[13px] font-bold text-text">{currentUser.fullName}</span>
              <span className="block text-xs text-dim">{currentUser.email}</span>
            </span>
            <ChevronDown size={14} className="text-muted" aria-hidden />
          </Link>

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
            {[...nav, { href: "/profile", label: "Profile", match: ["/profile", "/booking-history", "/notifications"] }].map((item) => (
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
          </ul>
        </nav>
      )}
    </header>
  );
}
