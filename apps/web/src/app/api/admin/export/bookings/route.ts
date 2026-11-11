import { desc, eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { audit } from "@/server/admin";
import { requireUser } from "@/server/auth";

/** CSV cell: quoted, with formula characters neutralised so a spreadsheet never runs a cell as a formula. */
const cell = (v: unknown) => {
  const text = String(v ?? "");
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};

/** ADMIN ONLY: every booking as a CSV file (opens in Excel). Recorded in the audit log. */
export async function GET() {
  const { user, error } = await requireUser("admin");
  if (error) return error;
  const rows = await db
    .select({
      ref: s.bookings.ref,
      customer: s.users.name,
      email: s.users.email,
      event: s.bookings.eventTitle,
      date: s.bookings.eventDateLabel,
      tickets: sql<string>`(SELECT COALESCE(SUM(bl.qty), 0) FROM booking_lines bl WHERE bl.booking_id = bookings.id)`,
      total: s.bookings.total,
      status: s.bookings.status,
      created: s.bookings.createdAt,
      verified: s.bookings.verifiedAt,
    })
    .from(s.bookings)
    .innerJoin(s.users, eq(s.users.id, s.bookings.userId))
    .orderBy(desc(s.bookings.createdAt));
  const lines = [
    ["Booking", "Customer", "Email", "Event", "Event date", "Tickets", "Amount (KRW)", "Status", "Booked (UTC)", "Payment verified (UTC)"].map(cell).join(","),
    ...rows.map((r) =>
      [r.ref, r.customer, r.email, r.event, r.date, r.tickets, r.total, r.status, r.created.toISOString(), r.verified?.toISOString() ?? ""].map(cell).join(","),
    ),
  ];
  await audit(db, user, { type: "export", action: `Exported all bookings (${rows.length})`, targetType: "report", targetId: "bookings" });
  // A byte-order mark so Excel reads Sinhala, Tamil and Korean names correctly.
  return new Response("\uFEFF" + lines.join("\r\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="sl-events-bookings-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
