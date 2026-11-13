// Accounts, passwords, sessions and email codes. Server code only (route handlers).
//
//   - Passwords are hashed with scrypt (built into Node, nothing native to install on Hostinger).
//   - A session is a random token in an httpOnly cookie; the database keeps only its SHA-256 hash, so a leaked
//     database can't be used to sign in. The mobile app will send the same token as "Authorization: Bearer ...".
//   - Email and password-reset codes are 6 digits, stored hashed, valid for 15 minutes and 5 tries.
//   - Every check that matters (who is signed in, which roles they hold) happens here, never in the browser.

import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { db, schema as s } from "@/db";
import { makeUser, type SessionUser } from "@/lib/session";
import { sendMail } from "./mail";

export const SESSION_COOKIE = "sl_session";
const SESSION_DAYS = 30;
const CODE_MINUTES = 15;
const CODE_TRIES = 5;

export type Role = (typeof s.roles)[number];
export type AccountUser = SessionUser & { roles: Role[] };

export { hashPassword, passwordProblem, verifyPassword } from "./password";

/* ---------- small helpers ---------- */

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
export const normEmail = (email: string) => email.trim().toLowerCase();
export const validEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 191;

/* ---------- sessions ---------- */

/** Starts a session for the user and sets the cookie. Returns the token (the app keeps it instead of a cookie). */
export async function startSession(userId: number): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const agent = (await headers()).get("user-agent")?.slice(0, 255) ?? null;
  await db.insert(s.sessions).values({ id: sha256(token), userId, expiresAt, userAgent: agent });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return token;
}

async function currentToken(): Promise<string | null> {
  const auth = (await headers()).get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim() || null;
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

/** Ends the current session (this device only) and clears the cookie. */
export async function endSession(): Promise<void> {
  const token = await currentToken();
  if (token) await db.delete(s.sessions).where(eq(s.sessions.id, sha256(token)));
  (await cookies()).delete(SESSION_COOKIE);
}

/** Signs the user out on every other device, keeping this one signed in. */
export async function endOtherSessions(userId: number): Promise<number> {
  const token = await currentToken();
  const [res] = await db
    .delete(s.sessions)
    .where(and(eq(s.sessions.userId, userId), token ? sql`${s.sessions.id} <> ${sha256(token)}` : undefined));
  return res.affectedRows;
}

/** Signs the user out everywhere, for example after a password reset. */
export const endAllSessions = (userId: number) => db.delete(s.sessions).where(eq(s.sessions.userId, userId));

async function rolesOf(userId: number): Promise<Role[]> {
  const rows = await db.select({ role: s.userRoles.role }).from(s.userRoles).where(eq(s.userRoles.userId, userId));
  // The order matters to the app: the first role is where an account lands after signing in.
  const order: Role[] = ["staff", "admin", "organizer", "customer"];
  return order.filter((r) => rows.some((x) => x.role === r));
}

export async function toAccountUser(user: typeof s.users.$inferSelect): Promise<AccountUser> {
  return { ...makeUser(user.name, user.email, !!user.emailVerifiedAt), roles: await rolesOf(user.id) };
}

/** The signed-in account for this request, or null. */
export async function currentUser(): Promise<(AccountUser & { id: number }) | null> {
  const token = await currentToken();
  if (!token) return null;
  const [row] = await db
    .select({ user: s.users })
    .from(s.sessions)
    .innerJoin(s.users, eq(s.users.id, s.sessions.userId))
    .where(and(eq(s.sessions.id, sha256(token)), gt(s.sessions.expiresAt, new Date()), isNull(s.users.disabledAt)));
  if (!row) return null;
  return { id: row.user.id, ...(await toAccountUser(row.user)) };
}

/** For route handlers: the signed-in account, optionally with one of the given roles, or a ready-made error response. */
export async function requireUser(...anyOf: Role[]): Promise<{ user: AccountUser & { id: number }; error?: undefined } | { user?: undefined; error: Response }> {
  const user = await currentUser();
  if (!user) return { error: Response.json({ error: "Please log in." }, { status: 401 }) };
  if (anyOf.length && !anyOf.some((r) => user.roles.includes(r))) return { error: Response.json({ error: "You don't have access to this." }, { status: 403 }) };
  return { user };
}

/* ---------- email codes ---------- */

export type CodePurpose = "verify_email" | "reset_password";

/** Makes a new 6-digit code (older unused ones for the same purpose stop working) and sends it. */
export async function issueCode(email: string, purpose: CodePurpose): Promise<string> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db
    .update(s.authCodes)
    .set({ usedAt: new Date() })
    .where(and(eq(s.authCodes.email, email), eq(s.authCodes.purpose, purpose), isNull(s.authCodes.usedAt)));
  await db.insert(s.authCodes).values({ email, purpose, codeHash: sha256(`${email}:${code}`), expiresAt: new Date(Date.now() + CODE_MINUTES * 60_000) });
  await sendCodeEmail(email, purpose, code);
  return code;
}

/** Checks a code. Each wrong try counts; after 5 the code is spent and a new one is needed. */
export async function checkCode(email: string, purpose: CodePurpose, code: string): Promise<"ok" | "wrong" | "expired"> {
  const [row] = await db
    .select()
    .from(s.authCodes)
    .where(and(eq(s.authCodes.email, email), eq(s.authCodes.purpose, purpose), isNull(s.authCodes.usedAt)))
    .orderBy(desc(s.authCodes.createdAt))
    .limit(1);
  if (!row || row.expiresAt < new Date() || row.attempts >= CODE_TRIES) return "expired";
  const given = Buffer.from(sha256(`${email}:${code.trim()}`));
  const ok = given.length === row.codeHash.length && timingSafeEqual(given, Buffer.from(row.codeHash));
  if (!ok) {
    await db.update(s.authCodes).set({ attempts: row.attempts + 1 }).where(eq(s.authCodes.id, row.id));
    return row.attempts + 1 >= CODE_TRIES ? "expired" : "wrong";
  }
  await db.update(s.authCodes).set({ usedAt: new Date() }).where(eq(s.authCodes.id, row.id));
  return "ok";
}

/**
 * Sends the code by email (server/mail.ts). Without SMTP settings the message goes to the server log instead, and in
 * development the API also returns the code so the screens can show it.
 */
async function sendCodeEmail(email: string, purpose: CodePurpose, code: string) {
  const verify = purpose === "verify_email";
  const subject = verify ? `${code} is your SL Events verification code` : `${code} is your SL Events password reset code`;
  const why = verify ? "Enter this code to confirm your email address:" : "Enter this code to choose a new password:";
  const ignore = verify ? "If you didn't create an SL Events account, you can ignore this email." : "If you didn't ask to reset your password, you can ignore this email: your password stays the same.";
  await sendMail({
    to: email,
    subject,
    text: `${why}

${code}

The code works for ${CODE_MINUTES} minutes.

${ignore}

SL Events`,
    html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#222;line-height:1.5"><p>${why}</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px;margin:16px 0">${code}</p><p>The code works for ${CODE_MINUTES} minutes.</p><p style="color:#666">${ignore}</p><p>SL Events</p></div>`,
  });
}

/** Codes are shown on screen only while developing, never on the live site. */
export const showCodes = process.env.NODE_ENV !== "production";

/* ---------- slowing down password guessing ---------- */

const failures = new Map<string, { count: number; until: number }>();
const WINDOW_MS = 15 * 60_000;
const MAX_FAILURES = 8;

/** True while an email has had too many wrong passwords recently (per server process, reset after 15 minutes). */
export function lockedOut(email: string): boolean {
  const f = failures.get(email);
  if (!f) return false;
  if (Date.now() > f.until) {
    failures.delete(email);
    return false;
  }
  return f.count >= MAX_FAILURES;
}
export function noteFailure(email: string) {
  const f = failures.get(email);
  failures.set(email, { count: (f && Date.now() <= f.until ? f.count : 0) + 1, until: Date.now() + WINDOW_MS });
}
export const clearFailures = (email: string) => failures.delete(email);

export const findUserByEmail = async (email: string) => (await db.select().from(s.users).where(eq(s.users.email, email)).limit(1))[0];
