import { requireUser } from "@/server/auth";
import { createBooking, listMyBookings } from "@/server/bookings";
import { readBody, text } from "../auth/_body";

/** The signed-in customer's own bookings, newest first. */
export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;
  return Response.json({ bookings: await listMyBookings(user) });
}

/**
 * Places a booking: `{ eventSlug, tickets: { general: 2 } , attendees: [...] }` or, for numbered seats,
 * `{ eventSlug, seatIds: ["odc-C7", ...], attendees: [...] }`. Prices, the fee and what is left are decided here.
 */
export async function POST(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;
  const body = await readBody(req);
  const result = await createBooking(user, {
    eventSlug: text(body.eventSlug),
    tickets: body.tickets && typeof body.tickets === "object" ? (body.tickets as Record<string, number>) : undefined,
    seatIds: Array.isArray(body.seatIds) ? (body.seatIds as string[]) : undefined,
    attendees: Array.isArray(body.attendees) ? (body.attendees as string[]) : [],
  });
  if (!result.ok) return Response.json({ error: result.error, errors: result.errors }, { status: result.status });
  return Response.json({ booking: result.value }, { status: 201 });
}
