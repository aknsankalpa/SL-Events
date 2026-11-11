import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { checkCode, clearFailures, endAllSessions, findUserByEmail, hashPassword, normEmail, passwordProblem } from "@/server/auth";
import { readBody, text } from "../_body";

/** Sets a new password with the emailed code. Every other signed-in device is signed out. */
export async function POST(req: Request) {
  const body = await readBody(req);
  const email = normEmail(text(body.email));
  const code = text(body.code).replace(/\s/g, "");
  const password = text(body.password);
  const weak = passwordProblem(password);
  if (weak) return Response.json({ errors: { password: weak } }, { status: 400 });
  if (!/^\d{6}$/.test(code)) return Response.json({ errors: { code: "Enter the 6-digit code from the email." } }, { status: 400 });

  const user = await findUserByEmail(email);
  const result = user && !user.disabledAt ? await checkCode(email, "reset_password", code) : "wrong";
  if (result !== "ok") {
    const message = result === "expired" ? "That code has expired or had too many tries. Ask for a new one." : "That code isn't right. Check the email and try again.";
    return Response.json({ errors: { code: message } }, { status: 400 });
  }
  // Receiving the code also proves the email address works.
  await db.update(s.users).set({ passwordHash: await hashPassword(password), emailVerifiedAt: user!.emailVerifiedAt ?? new Date() }).where(eq(s.users.id, user!.id));
  await endAllSessions(user!.id);
  clearFailures(email);
  return Response.json({ ok: true });
}
