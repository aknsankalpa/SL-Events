import { findUserByEmail, issueCode, normEmail, showCodes, validEmail } from "@/server/auth";
import { readBody, text } from "../_body";

/** Sends a password reset code. The answer is the same whether or not the email has an account. */
export async function POST(req: Request) {
  const email = normEmail(text((await readBody(req)).email));
  if (!validEmail(email)) return Response.json({ error: "Enter the email you signed up with." }, { status: 400 });
  const user = await findUserByEmail(email);
  const code = user && !user.disabledAt ? await issueCode(email, "reset_password") : undefined;
  return Response.json({ ok: true, ...(showCodes && code ? { devCode: code } : {}) });
}
