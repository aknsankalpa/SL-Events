import type { NextRequest } from "next/server";
import { requireUser } from "@/server/auth";
import { eventForEditor, requireOrganizer, saveEvent } from "@/server/organizer";
import { readBody } from "../../../auth/_body";

const idOf = (raw: string) => (/^\d{1,12}$/.test(raw) ? Number(raw) : null);

/** One event with its draft: for its organizer, or for an admin reviewing it (the preview page uses this). */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/organizer/events/[id]">) {
  const { user, error } = await requireUser("organizer", "admin");
  if (error) return error;
  const id = idOf((await ctx.params).id);
  const event = id === null ? undefined : await eventForEditor(user, id);
  if (!event) return Response.json({ error: "We couldn't find that event." }, { status: 404 });
  return Response.json({ event });
}

/** Saves the event: `{ draft, submit? }`. */
export async function PUT(req: NextRequest, ctx: RouteContext<"/api/organizer/events/[id]">) {
  const { org, error } = await requireOrganizer();
  if (error) return error;
  const id = idOf((await ctx.params).id);
  if (id === null) return Response.json({ error: "We couldn't find that event." }, { status: 404 });
  const body = await readBody(req);
  const result = await saveEvent(org, id, body.draft, { submit: body.submit === true });
  if (!result.ok) return Response.json({ error: result.error, problems: result.problems }, { status: result.status });
  return Response.json({ event: result.value });
}
