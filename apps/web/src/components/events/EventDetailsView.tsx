import Link from "next/link";
import { CheckCircle2, CalendarDays, ChevronRight, Globe, Landmark, Mail, MapPin, Phone, Ticket, Upload, User } from "lucide-react";
import { CategoryIcon, coverGradients, coverIconClass } from "@/components/events/CategoryIcon";
import { EventTicketsCard } from "@/components/events/EventTicketsCard";
import { Breadcrumbs } from "@/components/ui/PageHeader";
import { SeatChartSection } from "@/components/seats/SeatChartSection";
import { RichText } from "@/components/ui/RichText";
import { Badge } from "@/components/ui/StatusBadge";
import { naverMapUrl } from "@/lib/calendar";
import { categories, type EventItem } from "@/lib/data";
import { organizerByName, slugify } from "@/lib/organizers";
import { normalizeUrl } from "@/lib/richText";

type Props = {
  event: EventItem;
  /** Organizer preview: nothing can be bought and links don't leave the page. */
  preview?: boolean;
  /** Uploaded cover image (data URL). Falls back to the category gradient. */
  coverUrl?: string;
};

/** The customer-facing event page body. Shared by the public route and the organizer's draft preview. */
export function EventDetailsView({ event, preview = false, coverUrl }: Props) {
  const categoryLabel = categories.find((c) => c.id === event.category)?.label ?? "Events";
  // Organizer details: what the organizer wrote on the event, otherwise their public profile.
  const profile = organizerByName(event.organizer);
  const about = event.organizerAbout ?? profile?.about;
  const email = event.organizerEmail ?? profile?.email;
  const link = event.organizerLink ?? profile?.link;
  const website = link ? normalizeUrl(link) : null;

  return (
    <div className="mx-auto max-w-site px-5 pb-16 pt-8">
      {/* The preview is just the advertisement, so the "Events / Category" trail (site navigation) is left out. */}
      {!preview && (
        <Breadcrumbs
          crumbs={[
            { label: "Events", href: "/events" },
            { label: categoryLabel, href: `/events?category=${event.category}` },
            { label: event.title },
          ]}
        />
      )}

      <div
        className={`relative ${preview ? "" : "mt-6"} flex h-56 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br sm:h-72 ${coverGradients[event.category]}`}
      >
        {coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- organizer-uploaded data URL
          <img src={coverUrl} alt="" className="absolute inset-0 size-full object-cover" />
        )}
        <span className="absolute left-4 top-4 rounded-full border border-gold/40 bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase text-gold">
          {event.category}
        </span>
        {!coverUrl && <CategoryIcon id={event.category} size={96} strokeWidth={1.5} className={coverIconClass(event.category)} />}
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
          {event.tagline && <p className="mt-3 text-sm text-muted">{event.tagline}</p>}

          <ul className="mt-6 grid gap-3 sm:grid-cols-3">
            <InfoTile Icon={CalendarDays} title={event.longDate} sub={`${event.time} · Korea time (KST)`} />
            <InfoTile Icon={MapPin} title={event.venue} sub={event.area} />
            <InfoTile Icon={User} title={event.organizer} sub="Organizer" />
          </ul>

          <Section title="About this event">
            {event.descriptionHtml ? (
              <RichText html={event.descriptionHtml} />
            ) : (
              event.description.map((p) => (
                <p key={p} className="text-sm leading-relaxed text-muted">
                  {p}
                </p>
              ))
            )}
          </Section>

          <Section title="Hosted by">
            <div className="rounded-xl border border-line bg-surface p-5">
              <p className="text-sm font-bold text-text">{event.organizer}</p>
              {about && <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-muted">{about}</p>}
              {profile && !preview && (
                <p className="mt-3 text-xs text-dim">
                  {profile.eventCount} upcoming event{profile.eventCount === 1 ? "" : "s"} ·{" "}
                  <Link href={`/events?organizer=${slugify(event.organizer)}`} className="font-bold text-amber hover:text-gold">
                    See all events by this organizer
                  </Link>
                </p>
              )}
              {(email || event.organizerPhone || website) && (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {email && <ContactChip href={`mailto:${email}`} Icon={Mail} label={email} preview={preview} />}
                  {event.organizerPhone && (
                    <ContactChip
                      href={`tel:${event.organizerPhone.replace(/[^\d+]/g, "")}`}
                      Icon={Phone}
                      label={event.organizerPhone}
                      preview={preview}
                    />
                  )}
                  {website && (
                    <ContactChip
                      href={website}
                      Icon={Globe}
                      label={website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                      external
                      preview={preview}
                    />
                  )}
                </ul>
              )}
            </div>
          </Section>

          {event.seatChart && (
            <Section title="Seat chart">
              <SeatChartSection chart={event.seatChart} slug={event.slug} preview={preview} />
            </Section>
          )}

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

        <EventTicketsCard event={event} preview={preview} />
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

function ContactChip({
  href,
  Icon,
  label,
  external,
  preview,
}: {
  href: string;
  Icon: typeof Mail;
  label: string;
  external?: boolean;
  preview?: boolean;
}) {
  const cls =
    "inline-flex max-w-full items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs font-bold text-text transition-colors hover:border-gold/50";
  const inner = (
    <>
      <Icon size={14} aria-hidden className="shrink-0 text-gold" />
      <span className="truncate">{label}</span>
    </>
  );
  return (
    <li className="min-w-0">
      {external ? (
        <a href={href} target="_blank" rel="noopener noreferrer nofollow" className={cls}>
          {inner}
        </a>
      ) : (
        // In preview, mail and phone links are inert so a click can't open a mail client from the frame.
        <a href={preview ? undefined : href} className={cls}>
          {inner}
        </a>
      )}
    </li>
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
