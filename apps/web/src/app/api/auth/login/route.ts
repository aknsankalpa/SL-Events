import { clearFailures, findUserByEmail, lockedOut, normEmail, noteFailure, startSession, toAccountUser, verifyPassword } from "@/server/auth";
import { readBody, text } from "../_body";

const WRONG = "That email and password don't match an account.";

/** Signs in with email and password. The same message for an unknown email and a wrong password, so neither is revealed. */
export async function POST(req: Request) {
  const body = await readBody(req);
  const email = normEmail(text(body.email));
  const password = text(body.password);
  if (!email || !password) return Response.json({ error: "Enter your email and password." }, { status: 400 });
  if (lockedOut(email)) return Response.json({ error: "Too many wrong tries. Wait 15 minutes, or reset your password." }, { status: 429 });

  const user = await findUserByEmail(email);
  if (!user || user.disabledAt || !(await verifyPassword(password, user.passwordHash))) {
    noteFailure(email);
    return Response.json({ error: WRONG }, { status: 401 });
  }
  clearFailures(email);
  const token = await startSession(user.id);
  // The mobile app asks for the token itself (it has no cookies); the website relies on the cookie.
  const wantsToken = req.headers.get("x-client") === "app";
  return Response.json({ user: await toAccountUser(user), ...(wantsToken ? { token } : {}) });
}
