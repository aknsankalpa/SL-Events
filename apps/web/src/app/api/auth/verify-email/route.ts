import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { checkCode, currentUser, findUserByEmail, normEmail, startSession, toAccountUser } from "@/server/auth";
import { readBody, text } from "../_body";

/** Confirms an email address with the 6-digit code. Signs in too, if this browser isn't signed in yet. */
export async function POST(req: Request) {
  const body = await readBody(req);
  const me = await currentUser();
  const email = normEmail(text(body.email) || me?.email || "");
  const code = text(body.code).replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return Response.json({ error: "Enter the 6-digit code from the email." }, { status: 400 });
  const user = await findUserByEmail(email);
  if (!user) return Response.json({ error: "That code isn't right. Check the email and try again." }, { status: 400 });

  const result = await checkCode(email, "verify_email", code);
  if (result === "expired") return Response.json({ error: "That code has expired or had too many tries. Send a new one." }, { status: 400 });
  if (result === "wrong") return Response.json({ error: "That code isn't right. Check the email and try again." }, { status: 400 });

  await db.update(s.users).set({ emailVerifiedAt: new Date() }).where(eq(s.users.id, user.id));
  const token = !me || me.id !== user.id ? await startSession(user.id) : undefined;
  // The mobile app keeps a new session's token itself (it has no cookies).
  const wantsToken = req.headers.get("x-client") === "app" && token;
  return Response.json({ user: await toAccountUser((await findUserByEmail(email))!), ...(wantsToken ? { token } : {}) });
}
