import type { NextRequest } from "next/server";
import { requireUser } from "@/server/auth";
import { eventBookings } from "@/server/staff";

/** Every booking of one event, for its organizer (owner or manager) or an admin. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/organizer/events/[id]/bookings">) {
  const { user, error } = await requireUser("organizer", "admin");
  if (error) return error;
  const raw = (await ctx.params).id;
  const bookings = /^\d{1,12}$/.test(raw) ? await eventBookings(user, Number(raw)) : undefined;
  if (!bookings) return Response.json({ error: "We couldn't find that event." }, { status: 404 });
  return Response.json({ bookings });
}
