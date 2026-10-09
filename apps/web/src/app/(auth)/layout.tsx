import { Landmark, QrCode, Ticket } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

const points = [
  { Icon: Ticket, text: "Book concerts, cricket and festivals in a minute" },
  { Icon: Landmark, text: "Pay by bank transfer from any Korean bank" },
  { Icon: QrCode, text: "Walk in with a QR pass on your phone" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen flex-1 lg:grid-cols-[43%_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-black p-[52px] lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_0%_100%,rgb(110_0_0/0.9),transparent_70%),radial-gradient(60%_40%_at_100%_100%,rgb(70_50_10/0.6),transparent_70%)]" />
        <div className="relative">
          <Logo height={80} priority />
        </div>

        <div className="relative">
          <h2 className="font-display text-[32px] font-bold leading-tight text-text">
            Bringing Sri Lankans closer.
          </h2>
          <ul className="mt-8 space-y-5">
            {points.map(({ Icon, text }) => (
              <li key={text} className="flex items-center gap-2.5 text-sm text-text">
                <span className="flex size-8 items-center justify-center rounded-lg bg-gold/15 text-gold">
                  <Icon size={16} aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-dim">© 2026 SL Events</p>
      </aside>

      <main className="flex items-center justify-center bg-page px-5 py-12">
        <div className="w-full max-w-[22.75rem] sm:max-w-[25.5rem]">
          <div className="mb-8 lg:hidden">
            <Logo height={56} />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
