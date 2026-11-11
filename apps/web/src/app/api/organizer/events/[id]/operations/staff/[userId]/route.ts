import type { NextRequest } from "next/server";
import { requireUser } from "@/server/auth";
import { removeStaff, updateStaff } from "@/server/operations";
import { readBody } from "../../../../../../auth/_body";

type Ctx = RouteContext<"/api/organizer/events/[id]/operations/staff/[userId]">;

async function ids(ctx: Ctx) {
  const { id, userId } = await ctx.params;
  return /^\d{1,12}$/.test(id) && /^\d{1,12}$/.test(userId) ? { eventId: Number(id), userId: Number(userId) } : null;
}

/** Changes a door team member's role, door, access hours, or pauses them (`status: "suspended"`). */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { user, error } = await requireUser("organizer", "admin");
  if (error) return error;
  const target = await ids(ctx);
  if (!target) return Response.json({ error: "Not found." }, { status: 404 });
  const result = await updateStaff(user, target.eventId, target.userId, await readBody(req));
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ ok: true });
}

/** Removes them from the door team; their access ends straight away. */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { user, error } = await requireUser("organizer", "admin");
  if (error) return error;
  const target = await ids(ctx);
  if (!target) return Response.json({ error: "Not found." }, { status: 404 });
  const result = await removeStaff(user, target.eventId, target.userId);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ ok: true });
}
