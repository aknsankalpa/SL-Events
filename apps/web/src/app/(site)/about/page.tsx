import type { Metadata } from "next";
import Link from "next/link";
import { HeartHandshake, Landmark, QrCode, Ticket, Users } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { citiesWithEvents, events } from "@/lib/data";
import { organizerProfiles } from "@/lib/organizers";

export const metadata: Metadata = {
  title: "About SL Events",
  description: "SL Events brings Sri Lankan concerts, sport, culture and food to the community in Korea, with simple ticketing.",
};

const principles = [
  { Icon: HeartHandshake, title: "Community first", body: "We exist so the community's events are easy to find, easy to book and easy to run." },
  {
    Icon: Landmark,
    title: "Simple, honest payments",
    body: "Pay by bank transfer with clear instructions. Every payment is checked by a person before tickets are issued.",
  },
  { Icon: QrCode, title: "Entry without the hassle", body: "Each ticket has its own QR code, checked at the door, so tickets can't be used twice." },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader title="About SL Events" subtitle="Sri Lankan events and entertainment in Korea, in one place." />
      <div className="mx-auto max-w-site space-y-14 px-5 py-12">
        <section className="grid items-start gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-4 text-[15px] leading-relaxed text-muted">
            <h2 className="font-display text-[30px] font-bold leading-tight text-text">Why we built it</h2>
            <p>
              Concerts, cricket cups, cultural festivals and food fairs happen all over Korea, but they used to be shared in chat
              groups and posters, and tickets were sorted out by message. It was hard to find what was on, and harder to be sure you
              had a seat.
            </p>
            <p>
              SL Events puts the community&apos;s events in one place. Visitors can browse for free. Customers book in minutes and keep
              their tickets on their phone. Organizers get a proper way to sell tickets, check people in and see how an event is going.
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-4 lg:grid-cols-1">
            {[
              [String(events.length), "upcoming events"],
              [String(organizerProfiles.length), "organizers"],
              [String(citiesWithEvents.length), "cities"],
            ].map(([value, label]) => (
              <Card key={label} className="p-5">
                <dd className="font-display text-4xl font-bold text-gold">{value}</dd>
                <dt className="mt-1 text-[13px] text-muted">{label}</dt>
              </Card>
            ))}
          </dl>
        </section>

        <section>
          <h2 className="font-display text-[30px] font-bold leading-tight text-text">What we care about</h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            {principles.map(({ Icon, title, body }) => (
              <li key={title} className="rounded-xl border border-line bg-surface p-6">
                <span className="flex size-10 items-center justify-center rounded-lg bg-gold/15 text-gold">
                  <Icon size={18} aria-hidden />
                </span>
                <h3 className="mt-5 text-lg font-bold text-text">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Card className="p-6">
            <span className="flex size-10 items-center justify-center rounded-lg bg-gold/15 text-gold">
              <Ticket size={18} aria-hidden />
            </span>
            <h3 className="mt-5 text-lg font-bold text-text">For people going out</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Browse by category, place or date. Create a free account when you&apos;re ready to book.
            </p>
            <LinkButton href="/events" className="mt-5">
              Explore events
            </LinkButton>
          </Card>
          <Card className="p-6">
            <span className="flex size-10 items-center justify-center rounded-lg bg-gold/15 text-gold">
              <Users size={18} aria-hidden />
            </span>
            <h3 className="mt-5 text-lg font-bold text-text">For people running events</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Apply to become an organizer. We review every application and reply within a couple of working days.
            </p>
            <LinkButton href="/become-an-organizer" variant="outline" className="mt-5">
              Become an organizer
            </LinkButton>
          </Card>
        </section>

        <p className="text-center text-sm text-muted">
          Questions?{" "}
          <Link href="/contact" className="font-bold text-amber hover:text-gold">
            Contact the team
          </Link>
          .
        </p>
      </div>
    </>
  );
}
