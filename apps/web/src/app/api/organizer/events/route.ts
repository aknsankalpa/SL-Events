import { listOrganizerEvents, requireOrganizer, saveEvent } from "@/server/organizer";
import { readBody } from "../../auth/_body";

/** The organizer's events, with their drafts and sales figures. */
export async function GET() {
  const { org, error } = await requireOrganizer();
  if (error) return error;
  return Response.json({ events: await listOrganizerEvents(org) });
}

/** Creates an event from the wizard: `{ draft, submit? }`. With `submit: true` it goes to SL Events for review. */
export async function POST(req: Request) {
  const { org, error } = await requireOrganizer();
  if (error) return error;
  const body = await readBody(req);
  const result = await saveEvent(org, null, body.draft, { submit: body.submit === true });
  if (!result.ok) return Response.json({ error: result.error, problems: result.problems }, { status: result.status });
  return Response.json({ event: result.value }, { status: 201 });
}
