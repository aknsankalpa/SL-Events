import type { NextRequest } from "next/server";
import { requireUser } from "@/server/auth";
import { reviewPayment } from "@/server/bookings";
import { readBody, text } from "../../../auth/_body";

/**
 * STAFF ONLY: `{ decision: "confirm" }` or `{ decision: "reject", reason }` for a payment under review. Only an admin
 * or an owner/manager of the event's organizer gets past the checks; anyone else is told the booking doesn't exist.
 */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/bookings/[ref]/review">) {
  const { user, error } = await requireUser("organizer", "admin");
  if (error) return error;
  const body = await readBody(req);
  const decision = body.decision === "confirm" ? "confirm" : body.decision === "reject" ? "reject" : null;
  if (!decision) return Response.json({ error: "Choose confirm or reject." }, { status: 400 });
  const result = await reviewPayment(user, (await ctx.params).ref, decision, text(body.reason));
  if (!result.ok) return Response.json({ error: result.error, errors: result.errors }, { status: result.status });
  return Response.json(result.value);
}
