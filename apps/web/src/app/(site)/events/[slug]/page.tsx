import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, CalendarDays, ChevronRight, MapPin, Upload, Ticket, User, Landmark } from "lucide-react";
import { CategoryIcon, coverGradients, coverIconClass } from "@/components/events/CategoryIcon";
import { EventTicketsCard } from "@/components/events/EventTicketsCard";
import { Breadcrumbs } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/StatusBadge";
import { naverMapUrl } from "@/lib/calendar";
import { categories, events, getEvent } from "@/lib/data";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return events.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = getEvent(slug);
  return { title: event?.title ?? "Event" };
}

export default async function EventDetailsPage({ params }: Props) {
  const { slug } = await params;
  const event = getEvent(slug);
  if (!event) notFound();

  const categoryLabel = categories.find((c) => c.id === event.category)?.label ?? "Events";

  return (
    <div className="mx-auto max-w-site px-5 pb-16 pt-8">
      <Breadcrumbs
        crumbs={[
          { label: "Events", href: "/events" },
          { label: categoryLabel, href: `/events?category=${event.category}` },
          { label: event.title },
        ]}
      />

      <div
        className={`relative mt-6 flex h-56 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br sm:h-72 ${coverGradients[event.category]}`}
      >
        <span className="absolute left-4 top-4 rounded-full border border-gold/40 bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase text-gold">
          {event.category}
        </span>
        <CategoryIcon id={event.category} size={96} strokeWidth={1.5} className={coverIconClass(event.category)} />
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_21rem]">
        <div>
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge tone="warning" className="uppercase">
              {event.category}
            </Badge>
            {event.sellingFast && (
              <Badge tone="danger" dot>
                Selling fast
              </Badge>
            )}
          </div>
          <h1 className="font-display text-[34px] font-bold leading-tight text-text sm:text-[40px]">{event.title}</h1>
          <p className="mt-3 text-sm text-muted">{event.tagline}</p>

          <ul className="mt-6 grid gap-3 sm:grid-cols-3">
            <InfoTile Icon={CalendarDays} title={event.longDate} sub={`${event.time} Korea time`} />
            <InfoTile Icon={MapPin} title={event.venue} sub={event.area} />
            <InfoTile Icon={User} title={event.organizer} sub="Organizer" />
          </ul>

          <Section title="About this event">
            {event.description.map((p) => (
              <p key={p} className="text-sm leading-relaxed text-muted">
                {p}
              </p>
            ))}
          </Section>

          <Section title="How payment works">
            <ol className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4 sm:flex-row sm:items-center sm:gap-1">
              {[
                { Icon: Landmark, text: "Pay by bank transfer" },
                { Icon: Upload, text: "Upload your receipt" },
                { Icon: Ticket, text: "Get your QR ticket" },
              ].map(({ Icon, text }, i, all) => (
                <li key={text} className="flex flex-1 items-center gap-3 text-[13px] font-bold text-text">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-gold/15 text-gold">
                    <Icon size={16} aria-hidden />
                  </span>
                  {text}
                  {i < all.length - 1 && <ChevronRight size={14} aria-hidden className="ml-auto hidden text-dim sm:block" />}
                </li>
              ))}
            </ol>
          </Section>

          <Section title="Good to know">
            <ul className="space-y-3">
              {[
                "Seats are held for 24 hours while you pay and upload proof.",
                "Payments are usually checked within 2–6 hours.",
                "Refunds are available until 3 days before the event.",
              ].map((t) => (
                <li key={t} className="flex items-center gap-3 text-[13px] text-muted">
                  <CheckCircle2 size={16} aria-hidden className="shrink-0 text-amber" />
                  {t}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Location">
            <a
              href={naverMapUrl(`${event.venue} ${event.city}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-line bg-surface text-center transition-colors hover:border-gold/50"
            >
              <MapPin size={24} className="text-danger" aria-hidden />
              <span className="text-[13px] font-bold text-text">{event.venue}</span>
              <span className="text-xs text-dim">{event.area} · Open in Naver Map</span>
            </a>
          </Section>
        </div>

        <EventTicketsCard event={event} />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-9 space-y-3">
      <h2 className="text-base font-bold text-text">{title}</h2>
      {children}
    </section>
  );
}

function InfoTile({ Icon, title, sub }: { Icon: typeof MapPin; title: string; sub: string }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
        <Icon size={16} aria-hidden />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-[13px] font-bold text-text">{title}</span>
        <span className="mt-1 block truncate text-xs text-dim">{sub}</span>
      </span>
    </li>
  );
}
