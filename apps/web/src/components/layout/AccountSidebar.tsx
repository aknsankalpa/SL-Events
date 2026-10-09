"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, HelpCircle, History, LogOut, Ticket, User } from "lucide-react";
import { currentUser } from "@/lib/data";

const items = [
  { href: "/profile", label: "Profile", Icon: User },
  { href: "/my-tickets", label: "My tickets", Icon: Ticket },
  { href: "/booking-history", label: "Booking history", Icon: History },
  { href: "/notifications", label: "Notifications", Icon: Bell, badge: 3 },
  { href: "/help", label: "Help & contact", Icon: HelpCircle },
];

export function AccountSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="rounded-xl border border-line bg-surface p-3 lg:sticky lg:top-[108px]">
      <div className="flex items-center gap-3 border-b border-line px-2 pb-4 pt-2">
        <span className="flex size-11 items-center justify-center rounded-full border border-gold/60 bg-surface-2 text-sm font-bold text-gold">
          {currentUser.initials}
        </span>
        <div className="leading-tight">
          <p className="text-sm font-bold text-text">{currentUser.fullName}</p>
          <p className="text-xs text-dim">Member since {currentUser.memberSinceShort}</p>
        </div>
      </div>

      <nav aria-label="Account" className="py-3">
        <ul className="space-y-1">
          {items.map(({ href, label, Icon, badge }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-bold transition-colors ${
                    active ? "bg-gold/15 text-gold" : "text-muted hover:bg-surface-2 hover:text-text"
                  }`}
                >
                  <Icon size={16} aria-hidden />
                  <span className="flex-1">{label}</span>
                  {badge && (
                    <span className="flex size-[18px] items-center justify-center rounded-full bg-danger text-[10px] text-white">
                      {badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-line pt-3">
        <button
          type="button"
          // TODO: clear the session via the auth API.
          onClick={() => router.push("/login")}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-bold text-danger transition-colors hover:bg-danger/10"
        >
          <LogOut size={16} aria-hidden /> Log out
        </button>
      </div>
    </aside>
  );
}
