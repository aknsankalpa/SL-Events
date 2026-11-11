import { db, schema as s } from "@/db";
import { findUserByEmail, hashPassword, issueCode, normEmail, passwordProblem, showCodes, startSession, toAccountUser, validEmail } from "@/server/auth";
import { readBody, text } from "../_body";

/** Creates a customer account, signs it in and sends the email verification code. */
export async function POST(req: Request) {
  const body = await readBody(req);
  const name = text(body.name).trim().replace(/\s+/g, " ");
  const email = normEmail(text(body.email));
  const password = text(body.password);

  const errors: Record<string, string> = {};
  if (!name) errors.name = "Enter your name.";
  else if (name.length > 120) errors.name = "That name is too long.";
  if (!validEmail(email)) errors.email = "Enter a valid email address.";
  const weak = passwordProblem(password);
  if (weak) errors.password = weak;
  if (Object.keys(errors).length) return Response.json({ errors }, { status: 400 });
  if (await findUserByEmail(email)) return Response.json({ errors: { email: "There is already an account with this email. Log in instead." } }, { status: 409 });

  const [created] = await db.insert(s.users).values({ email, name, passwordHash: await hashPassword(password) }).$returningId();
  await db.insert(s.userRoles).values({ userId: created!.id, role: "customer" });
  const code = await issueCode(email, "verify_email");
  await startSession(created!.id);
  const user = (await findUserByEmail(email))!;
  return Response.json({ user: await toAccountUser(user), ...(showCodes ? { devCode: code } : {}) }, { status: 201 });
}
