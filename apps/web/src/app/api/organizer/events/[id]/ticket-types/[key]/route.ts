import type { NextRequest } from "next/server";
import { requireOrganizer } from "@/server/organizer";
import { updateTicketType } from "@/server/ticketTypes";
import { readBody } from "../../../../../auth/_body";

/** Changes one ticket type: name, what buyers get, price, quantity, max per order, last sales day, hidden, paused. */
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/organizer/events/[id]/ticket-types/[key]">) {
  const { org, error } = await requireOrganizer();
  if (error) return error;
  const { id, key } = await ctx.params;
  if (!/^\d{1,12}$/.test(id)) return Response.json({ error: "We couldn't find that event." }, { status: 404 });
  const result = await updateTicketType(org, Number(id), decodeURIComponent(key), await readBody(req));
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json(result.value);
}
