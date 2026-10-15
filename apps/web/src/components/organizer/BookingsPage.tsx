"use client";

import { useMemo, useState } from "react";
import { Download, Mail, Search, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/StatusBadge";
import { formatKrw } from "@/lib/format";
import { bookingTabCounts, orgBookings, orgBookingStatus, type OrgBooking, type OrgBookingStatus } from "@/lib/organizer";
import { useOrganizer } from "./OrganizerContext";
import { downloadCsv, EventPicker, OrgPageHeader, Panel } from "./ui";

type TabId = "all" | OrgBookingStatus;

const tabs: { id: TabId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "paid", label: "Paid" },
  { id: "under_review", label: "Under review" },
  { id: "awaiting_payment", label: "Awaiting payment" },
  { id: "rejected", label: "Rejected" },
  { id: "cancelled", label: "Cancelled" },
];

export function BookingsPage() {
  const { event } = useOrganizer();
  const [tab, setTab] = useState<TabId>("all");
  const [query, setQuery] = useState("");
  const rows: OrgBooking[] = orgBookings;
  const [openId, setOpenId] = useState<string>(orgBookings[0]!.id);
  const [drawer, setDrawer] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (b) =>
        (tab === "all" || b.status === tab) && (!q || `${b.id} ${b.buyer} ${b.email}`.toLowerCase().includes(q)),
    );
  }, [rows, tab, query]);

  const selected = rows.find((b) => b.id === openId);

  function open(id: string) {
    setOpenId(id);
    setDrawer(true);
  }

  return (
    <>
      <OrgPageHeader
        crumbs={[{ label: event.title }, { label: "Bookings" }]}
        title="Bookings"
        actions={
          <>
            <EventPicker />
            <Button
              variant="outline"
              className="border-line text-text hover:bg-surface-2"
              onClick={() =>
                downloadCsv("bookings.csv", [
                  ["Booking", "Buyer", "Email", "Tickets", "Amount (KRW)", "Status", "Booked"],
                  ...visible.map((b) => [b.id, b.buyer, b.email, b.tickets, b.amount, orgBookingStatus[b.status].label, b.booked]),
                ])
              }
            >
              <Download size={16} aria-hidden /> Export
            </Button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Booking status" className="-mx-1 flex max-w-full gap-1 overflow-x-auto px-1">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-bold transition-colors focus-visible:focus-ring ${
                  active ? "border-amber text-gold" : "border-transparent text-muted hover:text-text"
                }`}
              >
                {t.label}
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted">{bookingTabCounts[t.id]}</span>
              </button>
            );
          })}
        </div>
        <label className="flex h-11 w-full items-center gap-2 rounded-xl border border-line bg-surface px-3 focus-within:border-gold sm:w-64">
          <Search size={14} aria-hidden className="text-muted" />
          <span className="sr-only">Search bookings</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search bookings"
            className="w-full bg-transparent text-[13px] text-text placeholder:text-dim focus:outline-none"
          />
        </label>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[1fr_19.5rem] 2xl:grid-cols-[1fr_21rem]">
        <Panel className="overflow-hidden">
          {/* Table on larger screens */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[40rem] text-left text-[13px]">
              <thead className="border-b border-line text-[10px] uppercase tracking-wider text-dim">
                <tr>
                  {["Booking", "Buyer", "Tickets", "Amount", "Payment", "Booked"].map((h) => (
                    <th key={h} scope="col" className="px-3 py-3.5 font-bold first:pl-5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((b) => (
                  <tr
                    key={b.id}
                    onClick={() => open(b.id)}
                    className={`cursor-pointer border-b border-line last:border-b-0 hover:bg-surface-2/60 ${
                      b.id === openId ? "bg-gold/5" : ""
                    }`}
                  >
                    <td className="py-4 pl-5 pr-4 font-mono text-[11px] text-muted">
                      <button type="button" onClick={() => open(b.id)} className="focus-visible:focus-ring">
                        {b.id}
                      </button>
                    </td>
                    <td className="px-3 py-4">
                      <p className="whitespace-nowrap font-bold text-text">{b.buyer}</p>
                      <p className="mt-0.5 text-[11px] text-dim">{b.email}</p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-muted">{b.tickets}</td>
                    <td className="whitespace-nowrap px-3 py-4 font-bold text-text">{formatKrw(b.amount)}</td>
                    <td className="px-4 py-4">
                      <Badge tone={orgBookingStatus[b.status].tone}>{orgBookingStatus[b.status].label}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-muted">{b.booked}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards on phones */}
          <ul className="divide-y divide-line md:hidden">
            {visible.map((b) => (
              <li key={b.id}>
                <button type="button" onClick={() => open(b.id)} className="block w-full p-4 text-left focus-visible:focus-ring">
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-text">{b.buyer}</span>
                      <span className="mt-0.5 block font-mono text-[11px] text-dim">{b.id}</span>
                    </span>
                    <Badge tone={orgBookingStatus[b.status].tone}>{orgBookingStatus[b.status].label}</Badge>
                  </span>
                  <span className="mt-3 flex items-center justify-between text-xs text-muted">
                    <span>{b.tickets}</span>
                    <span className="font-bold text-text">{formatKrw(b.amount)}</span>
                    <span>{b.booked}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {visible.length === 0 && <p className="p-8 text-center text-sm text-muted">No bookings match.</p>}
          <p className="border-t border-line px-5 py-3 text-[11px] text-dim">
            Showing {visible.length} of {bookingTabCounts[tab]} bookings
          </p>
        </Panel>

        {/* Detail: side panel on wide screens, full-screen sheet on smaller ones */}
        {selected && (
          <div
            className={`${drawer ? "fixed inset-0 z-40 overflow-y-auto bg-page p-4 sm:p-6" : "hidden"} xl:sticky xl:top-6 xl:block xl:overflow-visible xl:bg-transparent xl:p-0`}
          >
            <BookingDetail booking={selected} onClose={() => setDrawer(false)} />
          </div>
        )}
      </div>
    </>
  );
}

function BookingDetail({ booking: b, onClose }: { booking: OrgBooking; onClose: () => void }) {
  const [sent, setSent] = useState(false);
  const meta = orgBookingStatus[b.status];

  return (
    <Panel className="overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-line p-5">
        <div>
          <p className="text-[11px] text-dim">Booking</p>
          <p className="mt-1 font-mono text-base font-bold text-text">{b.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={meta.tone} dot>
            {meta.label}
          </Badge>
          <button
            type="button"
            aria-label="Close details"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:text-text"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-6 p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-gold/60 bg-surface-2 text-[13px] font-bold text-gold">
            {b.buyer
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)}
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-bold text-text">{b.buyer}</p>
            <p className="mt-1 truncate text-[11px] text-dim">
              {b.email} · {b.phone}
            </p>
          </div>
        </div>

        {b.holders.length > 0 && (
          <section>
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-dim">Tickets</h3>
            <ul className="space-y-2">
              {b.holders.map((h) => (
                <li key={h.code} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-2 p-3">
                  <span className="min-w-0 leading-tight">
                    <span className="block truncate text-[13px] font-bold text-text">
                      {h.name} · {h.ticket}
                    </span>
                    <span className="mt-1 block font-mono text-[10px] text-dim">{h.code}</span>
                  </span>
                  <Badge tone={b.status === "cancelled" ? "neutral" : "success"}>Valid</Badge>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-dim">Payment</h3>
          <div className="flex items-center gap-3">
            <span aria-hidden className="h-11 w-12 shrink-0 rounded bg-slate-100 p-1.5">
              <span className="mb-1 block h-1 w-5 rounded bg-blue-500" />
              <span className="block h-0.5 w-full rounded bg-slate-300" />
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-[13px] font-bold text-text">Bank transfer · {formatKrw(b.amount)}</p>
              <p className="mt-1 text-[11px] text-dim">
                {b.approvedBy ? `Approved by ${b.approvedBy} · ${b.approvedAt}` : "Not approved yet"}
              </p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-dim">History</h3>
          <ul className="space-y-2.5 text-xs">
            {b.history.map((h) => (
              <li key={h.label + h.at} className="flex justify-between gap-3 text-muted">
                <span>{h.label}</span>
                <span className="shrink-0 text-dim">{h.at}</span>
              </li>
            ))}
          </ul>
        </section>

        <Button
          variant="outline"
          size="sm"
          className="w-full border-line text-text hover:bg-surface-2"
          disabled={b.status !== "paid"}
          // TODO: re-send the ticket email through the API.
          onClick={() => setSent(true)}
        >
          <Mail size={14} aria-hidden /> {sent ? "Sent" : "Resend tickets"}
        </Button>
      </div>
    </Panel>
  );
}
