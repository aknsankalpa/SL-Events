import { requireUser } from "@/server/auth";
import { canCheckIn, checkIn } from "@/server/staff";
import { readBody, text } from "../../auth/_body";

/**
 * Checks a ticket in at the door: `{ eventId, code, gate? }`. Allowed for the event's organizer (owner or manager),
 * admins and door staff assigned to the event. The answer says whether to let the person in, and why not.
 */
export async function POST(req: Request) {
  const { user, error } = await requireUser("organizer", "admin", "staff");
  if (error) return error;
  const body = await readBody(req);
  const eventId = Number(body.eventId);
  const code = text(body.code);
  if (!Number.isInteger(eventId) || eventId <= 0 || !code.trim()) return Response.json({ error: "Send the event and the ticket code." }, { status: 400 });
  if (!(await canCheckIn(user, eventId))) return Response.json({ error: "You aren't on the door team for this event." }, { status: 403 });
  const gate = text(body.gate).trim().slice(0, 60) || null;
  return Response.json(await checkIn(user, eventId, code, gate));
}
