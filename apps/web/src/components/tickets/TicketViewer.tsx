"use client";

import { useRef, useState } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight, Download, Info, Navigation, QrCode, ShieldCheck } from "lucide-react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/StatusBadge";
import { buildIcs, downloadIcs, naverMapUrl } from "@/lib/calendar";
import type { IssuedTicket } from "@/lib/bookings";
import type { EventItem } from "@/lib/data";

type Props = { event: EventItem; bookingId: string; tickets: IssuedTicket[] };

const entranceTips = [
  "Have your ID ready. The name must match the ticket.",
  "Screenshots work, but only the first scan is accepted.",
  "Lost your phone? Staff can find your booking by email.",
];

export function TicketViewer({ event, bookingId, tickets }: Props) {
  const [index, setIndex] = useState(0);
  const exportRef = useRef<HTMLCanvasElement>(null);
  const ticket = tickets[index]!;
  const others = tickets.map((t, i) => ({ t, i })).filter(({ i }) => i !== index);

  function saveImage() {
    const url = exportRef.current?.toDataURL("image/png");
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ticket.code}.png`;
    a.click();
  }

  function addToCalendar() {
    downloadIcs(
      `${event.slug}.ics`,
      buildIcs({ title: event.title, startsAt: event.startsAt, location: `${event.venue}, ${event.area}` }),
    );
  }

  const go = (delta: number) => setIndex((i) => (i + delta + tickets.length) % tickets.length);

  return (
    <div className="mx-auto grid max-w-site gap-10 px-5 pb-16 pt-8 lg:grid-cols-[26.5rem_1fr]">
      <div>
        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label="Previous ticket"
            onClick={() => go(-1)}
            disabled={tickets.length < 2}
            className="flex size-9 items-center justify-center rounded-full border border-line bg-surface text-text disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>
          <p className="text-[13px] font-bold text-text" aria-live="polite">
            Ticket {index + 1} of {tickets.length}
          </p>
          <button
            type="button"
            aria-label="Next ticket"
            onClick={() => go(1)}
            disabled={tickets.length < 2}
            className="flex size-9 items-center justify-center rounded-full border border-line bg-surface text-text disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <article
          aria-label={`Ticket for ${ticket.holder}`}
          className="relative mx-auto mt-5 max-w-[25rem] overflow-hidden rounded-2xl border border-gold/50 bg-surface"
        >
          <div className="border-b-4 border-amber bg-gradient-to-br from-[#8f1212] to-[#e0281f] px-6 py-5">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-white/80">
              <span>SL Events.kr</span>
              <span>Admit one</span>
            </div>
            <h2 className="mt-4 text-xl font-bold text-white">{event.title}</h2>
            <p className="mt-1 text-xs text-white/80">
              {event.longDate} · {event.time}
            </p>
          </div>

          <div className="px-6 pb-6 pt-7">
            <div className="relative mx-auto w-fit rounded-2xl bg-white p-4">
              {ticket.scanned ? (
                // A used ticket shows no scannable code, so a screenshot of it is of no use.
                <div className="flex size-40 flex-col items-center justify-center gap-2 text-center text-slate-500">
                  <ShieldCheck size={36} aria-hidden />
                  <span className="text-sm font-bold">Ticket used</span>
                  <span className="text-[11px]">Scanned at the entrance</span>
                </div>
              ) : (
                // TODO: encode a signed, single-use token issued by the API instead of the plain ticket code.
                <QRCodeSVG value={ticket.code} size={160} level="M" marginSize={0} title={`QR code for ticket ${ticket.code}`} />
              )}
            </div>
            <p className="mt-4 text-center font-mono text-sm tracking-widest text-text">{ticket.code}</p>

            <div className="relative my-6 border-t border-dashed border-line">
              <span aria-hidden className="absolute -left-9 -top-3 size-6 rounded-full border border-gold/50 bg-page" />
              <span aria-hidden className="absolute -right-9 -top-3 size-6 rounded-full border border-gold/50 bg-page" />
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
              {[
                ["Name", ticket.holder],
                ["Ticket", ticket.ticketName],
                ["Venue", event.venue],
                ["Doors open", event.doorsOpen],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-dim">{k}</dt>
                  <dd className="mt-1 text-[13px] font-bold text-text">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </article>

        <p className="mt-4 flex items-center justify-center gap-2 text-[11px] text-dim">
          <Info size={12} aria-hidden /> Turn your screen brightness up at the entrance.
        </p>

        {/* Off-screen canvas used only to export the QR as a PNG. */}
        {!ticket.scanned && (
          <div className="sr-only" aria-hidden>
            <QRCodeCanvas ref={exportRef} value={ticket.code} size={600} level="M" marginSize={4} />
          </div>
        )}
      </div>

      <div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={ticket.scanned ? "neutral" : "success"} dot>
            {ticket.scanned ? "Used" : "Valid"}
          </Badge>
          <Badge>{ticket.scanned ? "Already scanned" : "Not scanned yet"}</Badge>
        </div>
        <h1 className="mt-4 font-display text-[34px] font-bold leading-tight text-text sm:text-[42px]">{event.title}</h1>
        <p className="mt-3 text-sm text-muted">
          {ticket.scanned ? "This ticket was scanned at the entrance and can't be used again." : "Show this QR code at the door. Each ticket can be scanned once."}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={saveImage} disabled={ticket.scanned}>
            <Download size={16} aria-hidden /> Save as image
          </Button>
          <Button variant="outline" className="border-line text-text hover:bg-surface-2" onClick={addToCalendar}>
            <CalendarPlus size={16} aria-hidden /> Add to calendar
          </Button>
          <a
            href={naverMapUrl(`${event.venue} ${event.city}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line px-6 text-sm font-bold text-text transition-colors hover:bg-surface-2 focus-visible:focus-ring"
          >
            <Navigation size={16} aria-hidden /> Directions
          </a>
        </div>

        <dl className="mt-6 grid gap-x-6 gap-y-5 rounded-xl border border-line bg-surface p-6 sm:grid-cols-3">
          <Info3 label="Date" value={event.longDate} />
          <Info3 label="Doors open" value={event.doorsOpen} />
          <Info3 label="Show starts" value={event.time} />
          <div className="border-t border-line pt-5 sm:col-span-2">
            <Info3 label="Venue" value={`${event.venue}, ${event.area}`} />
          </div>
          <div className="border-t border-line pt-5">
            <Info3 label="Booking" value={bookingId} />
          </div>
        </dl>

        <section className="mt-5 rounded-xl border border-line bg-surface p-6">
          <h2 className="mb-4 text-sm font-bold text-text">At the entrance</h2>
          <ul className="space-y-3.5">
            {entranceTips.map((tip) => (
              <li key={tip} className="flex items-center gap-3 text-[13px] text-muted">
                <ShieldCheck size={14} aria-hidden className="shrink-0 text-amber" />
                {tip}
              </li>
            ))}
          </ul>
        </section>

        {others.length > 0 && (
          <section className="mt-7">
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted">Other tickets in this booking</h2>
            <ul className="space-y-3">
              {others.map(({ t, i }) => (
                <li key={t.code} className="flex items-center gap-4 rounded-xl border border-line bg-surface p-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
                    <QrCode size={16} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="text-[13px] font-bold text-text">
                      {t.holder} · {t.ticketName}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-dim">{t.code}</p>
                  </div>
                  <Badge tone={t.scanned ? "neutral" : "success"}>{t.scanned ? "Used" : "Valid"}</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-line text-text hover:bg-surface-2"
                    onClick={() => {
                      setIndex(i);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    Show
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

function Info3({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-wider text-dim">{label}</dt>
      <dd className="mt-1.5 text-[13px] font-bold text-text">{value}</dd>
    </div>
  );
}
