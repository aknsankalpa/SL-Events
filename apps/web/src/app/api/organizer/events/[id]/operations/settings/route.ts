import type { NextRequest } from "next/server";
import type { OpsSettings } from "@/lib/operations";
import { requireUser } from "@/server/auth";
import { saveOpsSettings } from "@/server/operations";
import { readBody } from "../../../../../auth/_body";

/** Saves the event-day settings (check-in opening time, late cut-off, re-entry, guest names, ...). */
export async function PUT(req: NextRequest, ctx: RouteContext<"/api/organizer/events/[id]/operations/settings">) {
  const { user, error } = await requireUser("organizer", "admin");
  if (error) return error;
  const raw = (await ctx.params).id;
  if (!/^\d{1,12}$/.test(raw)) return Response.json({ error: "We couldn't find that event." }, { status: 404 });
  const result = await saveOpsSettings(user, Number(raw), ((await readBody(req)).settings ?? {}) as Partial<OpsSettings>);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ settings: result.value });
}
