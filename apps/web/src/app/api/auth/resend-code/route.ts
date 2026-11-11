import { currentUser, findUserByEmail, issueCode, normEmail, showCodes } from "@/server/auth";
import { readBody, text } from "../_body";

/** Sends a new verification code. Always answers the same way, so it can't be used to find out who has an account. */
export async function POST(req: Request) {
  const body = await readBody(req);
  const me = await currentUser();
  const email = normEmail(text(body.email) || me?.email || "");
  const user = email ? await findUserByEmail(email) : undefined;
  const code = user && !user.emailVerifiedAt && !user.disabledAt ? await issueCode(email, "verify_email") : undefined;
  return Response.json({ ok: true, ...(showCodes && code ? { devCode: code } : {}) });
}
