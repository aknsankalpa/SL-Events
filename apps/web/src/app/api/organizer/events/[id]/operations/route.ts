import type { NextRequest } from "next/server";
import { requireUser } from "@/server/auth";
import { getOperations } from "@/server/operations";

/** Event-day operations: door staff, settings, the activity feed and entry statistics. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/organizer/events/[id]/operations">) {
  const { user, error } = await requireUser("organizer", "admin");
  if (error) return error;
  const raw = (await ctx.params).id;
  const ops = /^\d{1,12}$/.test(raw) ? await getOperations(user, Number(raw)) : undefined;
  if (!ops) return Response.json({ error: "We couldn't find that event." }, { status: 404 });
  return Response.json(ops);
}
