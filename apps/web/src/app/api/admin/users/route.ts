import type { NextRequest } from "next/server";
import { requireUser } from "@/server/auth";
import { inviteAdmin, listPeople } from "@/server/users";
import { readBody, text } from "../../auth/_body";

/** ADMIN ONLY: people (`?q=` searches name and email) and the counts for each tab. */
export async function GET(req: NextRequest) {
  const { error } = await requireUser("admin");
  if (error) return error;
  return Response.json(await listPeople(req.nextUrl.searchParams.get("q") ?? ""));
}

/** ADMIN ONLY: `{ name, email }` adds an admin (creating the account if the email has none). */
export async function POST(req: Request) {
  const { user, error } = await requireUser("admin");
  if (error) return error;
  const body = await readBody(req);
  const result = await inviteAdmin(user, text(body.name), text(body.email));
  if (!result.ok) return Response.json({ error: result.error, errors: result.errors }, { status: result.status });
  return Response.json(result.value, { status: 201 });
}
