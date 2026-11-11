import type { NextRequest } from "next/server";
import { requireUser } from "@/server/auth";
import { setActive, setAdminAccess } from "@/server/users";
import { readBody } from "../../../auth/_body";

/** ADMIN ONLY: `{ admin: true|false }` gives or takes admin access; `{ active: true|false }` (de)activates the account. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/admin/users/[id]">) {
  const { user, error } = await requireUser("admin");
  if (error) return error;
  const raw = (await ctx.params).id;
  if (!/^\d{1,12}$/.test(raw)) return Response.json({ error: "We couldn't find that person." }, { status: 404 });
  const body = await readBody(req);
  const result =
    typeof body.admin === "boolean"
      ? await setAdminAccess(user, Number(raw), body.admin)
      : typeof body.active === "boolean"
        ? await setActive(user, Number(raw), body.active)
        : null;
  if (!result) return Response.json({ error: "Say what to change." }, { status: 400 });
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json(result.value);
}
