import type { NextRequest } from "next/server";
import { getEventBySlug } from "@/server/events";

/** One event with its seat chart, or 404. Used by the mobile app. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/events/[slug]">) {
  const { slug } = await ctx.params;
  const event = await getEventBySlug(slug);
  if (!event) return Response.json({ error: "Event not found" }, { status: 404 });
  return Response.json({ event });
}
