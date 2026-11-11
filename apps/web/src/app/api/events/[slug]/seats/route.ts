import type { NextRequest } from "next/server";
import { takenSeatsForEvent } from "@/server/bookings";

/** Seat ids taken right now at an event (never who holds them). Seat pickers ask again every so often. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/events/[slug]/seats">) {
  const taken = await takenSeatsForEvent((await ctx.params).slug);
  if (!taken) return Response.json({ error: "Event not found" }, { status: 404 });
  return Response.json({ taken }, { headers: { "cache-control": "no-store" } });
}
