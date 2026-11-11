import type { NextRequest } from "next/server";
import { requireUser } from "@/server/auth";
import { decideEvent, type EventDecision } from "@/server/admin";
import { readBody, text } from "../../../auth/_body";

const DECISIONS: EventDecision[] = ["approve", "changes", "unpublish", "republish", "cancel", "rename"];

/** ADMIN ONLY: `{ decision, text }`. `text` is the reason (or the new title for "rename"). */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/admin/events/[id]">) {
  const { user, error } = await requireUser("admin");
  if (error) return error;
  const raw = (await ctx.params).id;
  const body = await readBody(req);
  const decision = DECISIONS.find((d) => d === body.decision);
  if (!/^\d{1,12}$/.test(raw) || !decision) return Response.json({ error: "Unknown decision." }, { status: 400 });
  const result = await decideEvent(user, Number(raw), decision, text(body.text));
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json(result.value);
}
