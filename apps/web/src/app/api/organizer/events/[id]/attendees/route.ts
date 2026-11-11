import type { NextRequest } from "next/server";
import { requireUser } from "@/server/auth";
import { eventAttendees } from "@/server/staff";

/** Ticket holders of one event and the figures above the list, for its organizer (owner or manager) or an admin. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/organizer/events/[id]/attendees">) {
  const { user, error } = await requireUser("organizer", "admin");
  if (error) return error;
  const raw = (await ctx.params).id;
  const result = /^\d{1,12}$/.test(raw) ? await eventAttendees(user, Number(raw)) : undefined;
  if (!result) return Response.json({ error: "We couldn't find that event." }, { status: 404 });
  return Response.json(result);
}
