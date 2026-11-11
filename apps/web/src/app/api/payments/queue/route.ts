import type { NextRequest } from "next/server";
import { requireUser } from "@/server/auth";
import { reviewQueue } from "@/server/staff";

/**
 * Payment proofs waiting to be checked, oldest first: the organizer's own events, or with `?all=1` every event (admins
 * only). Decisions go to POST /api/bookings/[ref]/review.
 */
export async function GET(req: NextRequest) {
  const { user, error } = await requireUser("organizer", "admin");
  if (error) return error;
  const all = req.nextUrl.searchParams.get("all") === "1";
  if (all && !user.roles.includes("admin")) return Response.json({ error: "You don't have access to this." }, { status: 403 });
  return Response.json({ items: await reviewQueue(user, all) });
}
