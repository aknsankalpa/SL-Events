import Link from "next/link";
import { Landmark, QrCode, Ticket, Upload } from "lucide-react";
import { CategoryIcon } from "@/components/events/CategoryIcon";
import { CustomerHome } from "@/components/home/CustomerHome";
import { EventsNearYou } from "@/components/home/EventsNearYou";
import { HomeIntro } from "@/components/home/HomeIntro";
import { ExploreBanner, FeaturedEvents, PopularOrganizers } from "@/components/home/HomeSections";
import { categories } from "@/lib/data";

const steps = [
  { n: "01", title: "Choose tickets", body: "Pick an event, a ticket type and how many you need.", Icon: Ticket },
  { n: "02", title: "Pay by transfer", body: "Send the amount by bank transfer from your banking app.", Icon: Landmark },
  { n: "03", title: "Upload proof", body: "Add a screenshot of your transfer. We check it within hours.", Icon: Upload },
  { n: "04", title: "Get your QR", body: "Your QR ticket appears in My tickets. Show it at the door.", Icon: QrCode },
];

export default function HomePage() {
  return (
    <>
      <HomeIntro />

      {/* Signed-in customers only: their tickets and recommendations. Renders nothing for visitors. */}
      <CustomerHome />

      <section id="categories" className="mx-auto max-w-site scroll-mt-24 px-5 py-16">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-amber">Explore</p>
            <h2 className="font-display text-[34px] font-bold leading-tight text-text">Something for everyone</h2>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-muted">
            From live music to cricket, find what is happening in your city.
          </p>
        </div>

        <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
          {categories.map((c) => (
            <li key={c.id}>
              <Link
                href={`/events?category=${c.id}`}
                className="flex h-24 flex-col items-center justify-center gap-3 rounded-xl border border-line bg-surface text-text transition-colors hover:border-gold/60 hover:text-gold focus-visible:focus-ring"
              >
                <CategoryIcon id={c.id} size={24} className="text-gold" />
                <span className="text-[13px] font-bold">{c.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <FeaturedEvents />

      <EventsNearYou />

      <PopularOrganizers />

      <section className="mx-auto max-w-site px-5 py-16">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-amber">How booking works</p>
        <h2 className="font-display text-[34px] font-bold leading-tight text-text">Four steps to your QR ticket</h2>

        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ n, title, body, Icon }) => (
            <li key={n} className="rounded-xl border border-line bg-surface p-6">
              <div className="flex items-start justify-between">
                <span className="font-display text-[40px] font-bold leading-none text-amber">{n}</span>
                <span className="flex size-10 items-center justify-center rounded-lg border border-line bg-surface-2 text-gold">
                  <Icon size={18} aria-hidden />
                </span>
              </div>
              <h3 className="mt-6 text-xl font-bold text-text">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <ExploreBanner />
    </>
  );
}
