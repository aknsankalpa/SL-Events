"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  CalendarDays,
  CheckCheck,
  CircleDollarSign,
  FileText,
  LayoutGrid,
  LogOut,
  Menu,
  QrCode,
  Settings,
  Tag,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { organizer } from "@/lib/organizer";
import { OrganizerProvider, useOrganizer } from "./OrganizerContext";

type NavItem = { href: string; label: string; Icon: LucideIcon; badge?: "pending"; match?: string[] };

const nav: NavItem[] = [
  { href: "/organizer", label: "Dashboard", Icon: LayoutGrid },
  { href: "/organizer/events", label: "Events", Icon: CalendarDays },
  { href: "/organizer/ticket-types", label: "Ticket types", Icon: Tag },
  { href: "/organizer/pricing", label: "Pricing", Icon: CircleDollarSign },
  { href: "/organizer/bookings", label: "Bookings", Icon: FileText },
  { href: "/organizer/verify-payments", label: "Verify payments", Icon: CheckCheck, badge: "pending" },
  { href: "/organizer/attendees", label: "Attendees", Icon: Users },
  { href: "/organizer/scanner", label: "QR scanner", Icon: QrCode },
  { href: "/organizer/settings", label: "Settings", Icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === "/organizer" ? pathname === "/organizer" : pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarContents({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { pending } = useOrganizer();

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-6 pt-5">
        <Logo height={52} href="/organizer" />
      </div>

      <nav aria-label="Organizer" className="flex-1 overflow-y-auto px-3">
        <ul className="space-y-1">
          {nav.map(({ href, label, Icon, badge }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-3 text-[13px] font-bold transition-colors ${
                    active ? "bg-gold/15 text-gold" : "text-muted hover:bg-surface-2 hover:text-text"
                  }`}
                >
                  <Icon size={16} aria-hidden />
                  <span className="flex-1">{label}</span>
                  {badge === "pending" && pending > 0 && (
                    <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] text-white">
                      {pending}
                      <span className="sr-only"> waiting</span>
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex items-center gap-3 border-t border-line px-4 py-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-gold/60 bg-surface-2 text-[13px] font-bold text-gold">
          {organizer.initials}
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[13px] font-bold text-text">{organizer.name}</p>
          <p className="mt-0.5 truncate text-[11px] text-dim">{organizer.org}</p>
        </div>
        <button
          type="button"
          aria-label="Log out"
          // TODO: end the organizer session via the auth API.
          onClick={() => router.push("/login")}
          className="rounded-lg p-2 text-muted hover:text-danger"
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="flex min-h-screen flex-1">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-line bg-black lg:block">
        <SidebarContents />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-black/95 px-4 backdrop-blur lg:hidden">
          <Logo height={40} href="/organizer" />
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="rounded-lg p-2 text-text"
          >
            <Menu size={24} />
          </button>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-7">{children}</main>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] border-r border-line bg-black shadow-2xl">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 rounded-lg p-2 text-muted hover:text-text"
            >
              <X size={20} />
            </button>
            <SidebarContents onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

export function OrganizerShell({ children }: { children: ReactNode }) {
  return (
    <OrganizerProvider>
      <Shell>{children}</Shell>
    </OrganizerProvider>
  );
}
