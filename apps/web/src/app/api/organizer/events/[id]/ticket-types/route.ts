import type { NextRequest } from "next/server";
import { requireOrganizer } from "@/server/organizer";
import { addTicketType, ticketTypesFor } from "@/server/ticketTypes";

/** The event's ticket types with what is sold and held. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/organizer/events/[id]/ticket-types">) {
  const { org, error } = await requireOrganizer();
  if (error) return error;
  const raw = (await ctx.params).id;
  const result = /^\d{1,12}$/.test(raw) ? await ticketTypesFor(org, Number(raw)) : undefined;
  if (!result) return Response.json({ error: "We couldn't find that event." }, { status: 404 });
  return Response.json(result);
}

/** Adds a hidden ticket type with no tickets yet. */
export async function POST(_req: NextRequest, ctx: RouteContext<"/api/organizer/events/[id]/ticket-types">) {
  const { org, error } = await requireOrganizer();
  if (error) return error;
  const raw = (await ctx.params).id;
  if (!/^\d{1,12}$/.test(raw)) return Response.json({ error: "We couldn't find that event." }, { status: 404 });
  const result = await addTicketType(org, Number(raw));
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json(result.value, { status: 201 });
}
