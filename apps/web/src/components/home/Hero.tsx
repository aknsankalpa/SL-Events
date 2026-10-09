import { AlertTriangle, CalendarDays, ChevronDown, MapPin, Mic2, QrCode, Search } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { currentUser, events, cities } from "@/lib/data";

export function ActionBanner() {
  return (
    <div className="mx-auto max-w-site px-5 pt-6">
      <div className="flex flex-col gap-3 rounded-lg border border-gold/40 bg-gold/10 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-3 text-sm font-bold text-gold">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
          Upload your payment proof for Kottu &amp; Hoppers Food Fair by tomorrow, 1:10 PM, or your seats are released.
        </p>
        <LinkButton href="/bookings/SL-41752/proof" size="sm" className="shrink-0">
          Upload proof
        </LinkButton>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="bg-hero-glow">
      <div className="mx-auto grid max-w-site items-center gap-12 px-5 py-14 lg:grid-cols-[1.15fr_1fr] lg:py-16">
        <div>
          <p className="mb-5 text-xs font-bold uppercase tracking-widest text-amber">
            Welcome back, {currentUser.firstName}
          </p>
          <h1 className="font-display text-5xl font-bold leading-[1.05] text-text sm:text-6xl lg:text-[72px]">
            Discover.
            <br />
            Book.
            <br />
            <span className="text-gold">Experience.</span>
          </h1>
          <p className="mt-6 max-w-md text-[17px] leading-relaxed text-muted">
            Concerts, cricket, culture and food festivals for the Sri Lankan community across Korea.
          </p>

          <form
            action="/events"
            role="search"
            className="mt-8 flex max-w-xl flex-col gap-2 rounded-xl border border-line bg-surface/90 p-2 sm:flex-row sm:items-center"
          >
            <label className="flex flex-1 items-center gap-3 px-3">
              <Search size={18} className="text-muted" aria-hidden />
              <span className="sr-only">Search events, artists or venues</span>
              <input
                name="q"
                type="search"
                placeholder="Search events, artists or venues"
                className="h-11 w-full bg-transparent text-sm text-text placeholder:text-muted focus:outline-none"
              />
            </label>
            <label className="flex items-center gap-2 border-line px-3 sm:border-l">
              <MapPin size={16} className="text-muted" aria-hidden />
              <span className="sr-only">City</span>
              <select
                name="city"
                defaultValue="Seoul"
                className="h-11 appearance-none bg-transparent pr-1 text-sm text-muted focus:outline-none"
              >
                {cities.map((c) => (
                  <option key={c} value={c} className="bg-surface text-text">
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="text-muted" aria-hidden />
            </label>
            <button
              type="submit"
              className="h-11 rounded-lg bg-gradient-to-b from-gold to-amber px-6 text-sm font-bold text-ink hover:brightness-110 focus-visible:focus-ring"
            >
              Search
            </button>
          </form>

          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
            {[
              [String(events.length), "upcoming events"],
              [String(events.filter((e) => e.city === "Seoul").length), "events in Seoul"],
              ["2", "tickets in your wallet"],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="sr-only">{label}</dt>
                <dd className="flex items-baseline gap-2">
                  <span className="font-display text-3xl font-bold text-gold">{value}</span>
                  <span className="text-[13px] text-muted">{label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <NextEventCard />
      </div>
    </section>
  );
}

function NextEventCard() {
  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl shadow-black/50">
      <div className="relative flex h-36 items-center justify-center bg-gradient-to-br from-[#4a0d0d] via-[#a31616] to-[#e0281f]">
        <span className="absolute left-4 top-4 rounded-full border border-gold/40 bg-black/60 px-2.5 py-1 text-[10px] font-bold text-gold">
          CONCERT
        </span>
        <Mic2 size={56} strokeWidth={1.5} className="text-white" aria-hidden />
      </div>
      <div className="space-y-3 p-6">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-amber">Your next event</p>
          <span className="rounded-full border border-success/40 bg-success/10 px-2.5 py-1 text-[10px] font-bold text-success">
            CONFIRMED
          </span>
        </div>
        <h2 className="text-2xl font-bold text-text">Sri Lankan Music Night</h2>
        <p className="flex items-center gap-2 text-[13px] text-muted">
          <CalendarDays size={14} aria-hidden /> Sat, 14 Nov 2026 · 6:00 PM
        </p>
        <p className="flex items-center gap-2 text-[13px] text-muted">
          <MapPin size={14} aria-hidden /> Hongdae Live Hall, Seoul
        </p>
        <div className="flex items-end justify-between gap-4 pt-2">
          <div>
            <p className="text-xs text-dim">2 passes · General</p>
            <p className="text-sm font-bold text-text">Starts in 36 days</p>
          </div>
          <LinkButton href="/my-tickets/SL-41730" size="sm">
            <QrCode size={16} aria-hidden /> View QR tickets
          </LinkButton>
        </div>
      </div>
    </article>
  );
}
