import type { NextRequest } from "next/server";
import { requireUser } from "@/server/auth";
import { getMyBooking } from "@/server/bookings";

/** One of the signed-in customer's bookings. Someone else's booking is reported as not found. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/bookings/[ref]">) {
  const { user, error } = await requireUser();
  if (error) return error;
  const booking = await getMyBooking(user, (await ctx.params).ref);
  if (!booking) return Response.json({ error: "We can't find that booking." }, { status: 404 });
  return Response.json({ booking });
}
