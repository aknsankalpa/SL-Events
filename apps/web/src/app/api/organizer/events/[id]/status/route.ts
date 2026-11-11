import type { NextRequest } from "next/server";
import { changeEventStatus, requireOrganizer } from "@/server/organizer";
import { readBody } from "../../../../auth/_body";

/** `{ action: "pause" | "resume" | "cancel" }`. Cancelling cancels every booking that still counts. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/organizer/events/[id]/status">) {
  const { org, error } = await requireOrganizer();
  if (error) return error;
  const raw = (await ctx.params).id;
  const action = (await readBody(req)).action;
  if (!/^\d{1,12}$/.test(raw) || (action !== "pause" && action !== "resume" && action !== "cancel")) {
    return Response.json({ error: "Choose pause, resume or cancel." }, { status: 400 });
  }
  const result = await changeEventStatus(org, Number(raw), action);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json(result.value);
}
