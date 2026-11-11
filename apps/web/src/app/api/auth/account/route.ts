import { count, eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { endAllSessions, endSession, requireUser, toAccountUser } from "@/server/auth";
import { readBody, text } from "../_body";

/** Changes the name on the account. The email identifies the account and its bookings, so it isn't changed here. */
export async function PATCH(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;
  const name = text((await readBody(req)).name).trim().replace(/\s+/g, " ");
  if (!name || name.length > 120) return Response.json({ errors: { name: "Enter your name." } }, { status: 400 });
  await db.update(s.users).set({ name }).where(eq(s.users.id, user.id));
  const [row] = await db.select().from(s.users).where(eq(s.users.id, user.id));
  return Response.json({ user: await toAccountUser(row!) });
}

/**
 * Closes the account. An account with bookings keeps its payment records, as the law requires, but can no longer sign
 * in; one without bookings is removed.
 */
export async function DELETE() {
  const { user, error } = await requireUser();
  if (error) return error;
  const [{ n }] = await db.select({ n: count() }).from(s.bookings).where(eq(s.bookings.userId, user.id));
  await endSession();
  await endAllSessions(user.id);
  if (n > 0) await db.update(s.users).set({ disabledAt: new Date(), passwordHash: null }).where(eq(s.users.id, user.id));
  else await db.delete(s.users).where(eq(s.users.id, user.id));
  return Response.json({ ok: true });
}
