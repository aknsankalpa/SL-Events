import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db, schema as s } from "@/db";
import { requireUser, startSession } from "@/server/auth";

/**
 * Signs the mobile app's built-in browser in, so organizers and admins don't log in twice.
 *
 *   1. POST (the app, with its "Authorization: Bearer" token): returns a random one-time code valid for 2 minutes.
 *   2. GET ?code=...&next=/organizer (the built-in browser): the code becomes a normal website session (a cookie of its
 *      own) and the browser goes on to `next`.
 *
 * Only a hash of the code is stored, it works once, and the app's token itself never appears in an address.
 */
const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

export async function POST() {
  const { user, error } = await requireUser();
  if (error) return error;
  const code = randomBytes(24).toString("base64url");
  await db.insert(s.authCodes).values({ email: user.email, purpose: "app_handoff", codeHash: sha256(code), expiresAt: new Date(Date.now() + 2 * 60_000) });
  return Response.json({ code });
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code") ?? "";
  const raw = req.nextUrl.searchParams.get("next") ?? "/";
  // Only paths on this website: never "//other.site" or a full address.
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
  const [row] = code
    ? await db
        .select()
        .from(s.authCodes)
        .where(and(eq(s.authCodes.codeHash, sha256(code)), eq(s.authCodes.purpose, "app_handoff"), isNull(s.authCodes.usedAt), gt(s.authCodes.expiresAt, new Date())))
    : [];
  if (row) {
    const [used] = await db.update(s.authCodes).set({ usedAt: new Date() }).where(and(eq(s.authCodes.id, row.id), isNull(s.authCodes.usedAt)));
    const [user] = await db.select().from(s.users).where(and(eq(s.users.email, row.email), isNull(s.users.disabledAt)));
    // Only the request that marked the code used signs in, so the same code can't open two sessions.
    if (user && used.affectedRows === 1) await startSession(user.id);
  }
  // Without a valid code the page simply asks to log in, as it would for anyone.
  // A relative address, so it stays right behind a proxy that changes the host name.
  return new Response(null, { status: 303, headers: { location: next, "cache-control": "no-store" } });
}
