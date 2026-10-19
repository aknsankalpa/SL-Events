import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

const columns = [
  {
    title: "Discover",
    links: [
      { href: "/events", label: "All events" },
      { href: "/#categories", label: "Categories" },
      { href: "/#upcoming", label: "Upcoming events" },
      { href: "/become-an-organizer", label: "Become an organizer" },
    ],
  },
  {
    title: "SL Events",
    links: [
      { href: "/about", label: "About SL Events" },
      { href: "/contact", label: "Contact & support" },
      { href: "/faq", label: "FAQ" },
      { href: "/payment-instructions", label: "Payment instructions" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms and conditions" },
      { href: "/privacy", label: "Privacy policy" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="mx-auto max-w-site px-5 pb-8 pt-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_2fr]">
          <div className="space-y-4">
            <Logo height={72} />
            <p className="text-sm leading-relaxed text-muted">
              Sri Lankan events and entertainment in Korea.
              <br />
              Discover, book and walk in with a QR pass.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {columns.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-amber">{col.title}</h2>
                <ul className="space-y-3">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className="text-sm text-muted transition-colors hover:text-gold">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-xs text-dim sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 SL Events. All rights reserved.</p>
          <p>English · Sinhala · Tamil · Korean</p>
        </div>
      </div>
    </footer>
  );
}
