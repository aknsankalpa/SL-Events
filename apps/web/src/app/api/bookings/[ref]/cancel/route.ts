import type { NextRequest } from "next/server";
import { requireUser } from "@/server/auth";
import { cancelBooking } from "@/server/bookings";

/** Cancels one of the customer's unpaid bookings, which frees its tickets and seats. */
export async function POST(_req: NextRequest, ctx: RouteContext<"/api/bookings/[ref]/cancel">) {
  const { user, error } = await requireUser();
  if (error) return error;
  const result = await cancelBooking(user, (await ctx.params).ref);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ booking: result.value });
}
