import type { NextRequest } from "next/server";
import { requireUser } from "@/server/auth";
import { addStaff } from "@/server/operations";
import { readBody } from "../../../../../auth/_body";

/** Adds someone to the event's door team: `{ name, contact (email), role, gate, accessFrom, accessUntil }`. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/organizer/events/[id]/operations/staff">) {
  const { user, error } = await requireUser("organizer", "admin");
  if (error) return error;
  const raw = (await ctx.params).id;
  if (!/^\d{1,12}$/.test(raw)) return Response.json({ error: "We couldn't find that event." }, { status: 404 });
  const result = await addStaff(user, Number(raw), await readBody(req));
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json(result.value, { status: 201 });
}
