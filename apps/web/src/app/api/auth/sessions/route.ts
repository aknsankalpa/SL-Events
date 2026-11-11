import { endOtherSessions, requireUser } from "@/server/auth";

/** Signs the account out on every other device; this one stays signed in. */
export async function DELETE() {
  const { user, error } = await requireUser();
  if (error) return error;
  return Response.json({ signedOut: await endOtherSessions(user.id) });
}
