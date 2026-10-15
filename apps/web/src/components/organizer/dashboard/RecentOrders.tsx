import { Badge } from "@/components/ui/StatusBadge";
import { formatKrw } from "@/lib/format";
import { orgBookings, orgBookingStatus } from "@/lib/organizer";

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);

/** The latest bookings as a table. The surrounding panel provides the card, title and scrolling. */
export function RecentOrders() {
  const rows = orgBookings.slice(0, 8);

  return (
    <table className="w-full min-w-0 text-left text-[13px]">
      <thead className="sticky top-0 z-10 bg-surface-2 text-[10px] uppercase tracking-wider text-dim">
        <tr>
          {["Buyer", "Booking", "Tickets", "Amount", "Status"].map((h) => (
            <th
              key={h}
              scope="col"
              className={`whitespace-nowrap px-3 py-2.5 font-bold sm:px-5 sm:first:pl-6 ${
                h === "Booking" ? "hidden sm:table-cell lg:hidden xl:table-cell" : h === "Tickets" ? "hidden sm:table-cell" : ""
              }`}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((b) => (
          <tr key={b.id} className="border-t border-line">
            <td className="px-3 py-2.5 sm:px-5 sm:pl-6">
              <span className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="hidden size-8 shrink-0 items-center justify-center rounded-full border border-gold/50 bg-surface-2 text-[10px] font-bold text-gold sm:flex"
                >
                  {initials(b.buyer)}
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="block whitespace-nowrap font-bold text-text">{b.buyer}</span>
                  <span className="mt-0.5 block whitespace-nowrap text-[11px] text-dim">{b.booked}</span>
                </span>
              </span>
            </td>
            <td className="hidden whitespace-nowrap px-5 py-2.5 font-mono text-[11px] text-muted sm:table-cell lg:hidden xl:table-cell">{b.id}</td>
            <td className="hidden whitespace-nowrap px-5 py-2.5 text-muted sm:table-cell">{b.tickets}</td>
            <td className="whitespace-nowrap px-3 py-2.5 font-bold text-text sm:px-5">{formatKrw(b.amount)}</td>
            <td className="px-3 py-2.5 sm:px-5">
              <Badge tone={orgBookingStatus[b.status].tone}>{orgBookingStatus[b.status].label}</Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
