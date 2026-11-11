import type { NextRequest } from "next/server";
import type { AppStatus } from "@/lib/admin";
import { requireUser } from "@/server/auth";
import { decideOrganizer } from "@/server/applications";
import { readBody, text } from "../../../auth/_body";

const STATUSES: AppStatus[] = ["new", "info_asked", "approved", "rejected", "suspended"];

/** ADMIN ONLY: `{ status, note }` for an application ("app-ORG-12345") or an organizer ("org-7"). */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/admin/organizers/[id]">) {
  const { user, error } = await requireUser("admin");
  if (error) return error;
  const body = await readBody(req);
  const status = STATUSES.find((x) => x === body.status);
  if (!status) return Response.json({ error: "Unknown decision." }, { status: 400 });
  const result = await decideOrganizer(user, decodeURIComponent((await ctx.params).id), status, text(body.note));
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json(result.value);
}
