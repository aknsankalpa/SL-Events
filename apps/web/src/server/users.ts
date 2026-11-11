// People and their access, for the admin's "Users and roles" page. Server code only (route handlers).
//
// Roles: customer (everyone who signs up), organizer (given by approving an application), door staff (given per
// event by an organizer) and admin (full access to the admin portal). Admins can give or take admin access and
// deactivate accounts here; an admin can't remove their own access, and there is always at least one admin.

import { and, count, desc, eq, inArray, isNull, like, or, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { audit } from "./admin";
import { endAllSessions, normEmail, validEmail, type AccountUser } from "./auth";

type User = AccountUser & { id: number };
type Role = (typeof s.roles)[number];
export type Outcome<T> = { ok: true; value: T } | { ok: false; status: number; error: string; errors?: Record<string, string> };
const fail = (status: number, error: string, errors?: Record<string, string>) => ({ ok: false as const, status, error, errors });

export type Person = {
  id: string;
  name: string;
  initials: string;
  email: string;
  roles: Role[];
  /** The role the list shows: the most powerful one the person has. */
  main: "Admin" | "Organizer" | "Door staff" | "Customer";
  organizer?: string;
  active: boolean;
  verified: boolean;
  hasPassword: boolean;
  last: string;
  joined: string;
  bookings: number;
  recent: { text: string; time: string }[];
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
const mainOf = (roles: Role[]): Person["main"] => (roles.includes("admin") ? "Admin" : roles.includes("organizer") ? "Organizer" : roles.includes("staff") ? "Door staff" : "Customer");
const kst = (d: Date) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Seoul" }).format(d);

function ago(d: Date) {
  const mins = Math.round((Date.now() - d.getTime()) / 60_000);
  if (mins < 2) return "Now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days < 30 ? `${days} day${days === 1 ? "" : "s"} ago` : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Seoul" }).format(d);
}

/** People matching the search (name or email), newest first, with the counts for each tab. */
export async function listPeople(q: string, limit = 300) {
  const term = q.trim();
  const rows = await db
    .select()
    .from(s.users)
    .where(term ? or(like(s.users.name, `%${term}%`), like(s.users.email, `%${term.toLowerCase()}%`)) : undefined)
    .orderBy(desc(s.users.createdAt), desc(s.users.id))
    .limit(limit);
  const ids = rows.map((r) => r.id);
  const none = [0];
  const roles = await db.select().from(s.userRoles).where(inArray(s.userRoles.userId, ids.length ? ids : none));
  const lastSeen = await db
    .select({ userId: s.sessions.userId, at: sql<Date>`MAX(${s.sessions.createdAt})` })
    .from(s.sessions)
    .where(inArray(s.sessions.userId, ids.length ? ids : none))
    .groupBy(s.sessions.userId);
  const bookingCounts = await db
    .select({ userId: s.bookings.userId, n: count() })
    .from(s.bookings)
    .where(inArray(s.bookings.userId, ids.length ? ids : none))
    .groupBy(s.bookings.userId);
  const orgs = await db
    .select({ userId: s.organizerMembers.userId, name: s.organizers.name })
    .from(s.organizerMembers)
    .innerJoin(s.organizers, eq(s.organizers.id, s.organizerMembers.organizerId))
    .where(and(inArray(s.organizerMembers.userId, ids.length ? ids : none), inArray(s.organizerMembers.role, ["owner", "manager"])));
  const recentAudit = await db
    .select({ actor: s.auditLog.actorUserId, action: s.auditLog.action, at: s.auditLog.at })
    .from(s.auditLog)
    .where(inArray(s.auditLog.actorUserId, ids.length ? ids : none))
    .orderBy(desc(s.auditLog.at))
    .limit(500);
  const recentBookings = await db
    .select({ userId: s.bookings.userId, title: s.bookings.eventTitle, at: s.bookings.createdAt })
    .from(s.bookings)
    .where(inArray(s.bookings.userId, ids.length ? ids : none))
    .orderBy(desc(s.bookings.createdAt))
    .limit(500);

  const people = rows.map((u): Person => {
    const mine = roles.filter((r) => r.userId === u.id).map((r) => r.role);
    const seen = lastSeen.find((x) => x.userId === u.id)?.at;
    const recent = [
      ...recentAudit.filter((a) => a.actor === u.id).map((a) => ({ text: a.action, at: a.at })),
      ...recentBookings.filter((b) => b.userId === u.id).map((b) => ({ text: `Booked ${b.title}`, at: b.at })),
    ]
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(0, 4)
      .map((r) => ({ text: r.text, time: kst(r.at) }));
    return {
      id: String(u.id),
      name: u.name,
      initials: initials(u.name),
      email: u.email,
      roles: mine,
      main: mainOf(mine),
      organizer: orgs.find((o) => o.userId === u.id)?.name,
      active: !u.disabledAt,
      verified: !!u.emailVerifiedAt,
      hasPassword: !!u.passwordHash,
      last: seen ? ago(new Date(seen)) : u.passwordHash ? "Not since sessions were kept" : "Hasn't set a password yet",
      joined: kst(u.createdAt),
      bookings: bookingCounts.find((b) => b.userId === u.id)?.n ?? 0,
      recent,
    };
  });

  // Tab counts over everyone, not only the people shown.
  const [{ all }] = await db.select({ all: count() }).from(s.users);
  const byRole = await db.select({ role: s.userRoles.role, n: count() }).from(s.userRoles).groupBy(s.userRoles.role);
  const n = (r: Role) => byRole.find((x) => x.role === r)?.n ?? 0;
  return { people, counts: { all, admins: n("admin"), organizers: n("organizer"), staff: n("staff"), customers: all - n("admin") - n("organizer") - n("staff") } };
}

async function adminCount() {
  const [{ n }] = await db
    .select({ n: count() })
    .from(s.userRoles)
    .innerJoin(s.users, eq(s.users.id, s.userRoles.userId))
    .where(and(eq(s.userRoles.role, "admin"), isNull(s.users.disabledAt)));
  return n;
}

/** Gives or takes admin access. */
export async function setAdminAccess(user: User, targetId: number, on: boolean): Promise<Outcome<{ roles: Role[] }>> {
  const [target] = await db.select().from(s.users).where(eq(s.users.id, targetId));
  if (!target) return fail(404, "We couldn't find that person.");
  const roles = (await db.select().from(s.userRoles).where(eq(s.userRoles.userId, targetId))).map((r) => r.role);
  if (on === roles.includes("admin")) return { ok: true, value: { roles } };
  if (!on && targetId === user.id) return fail(409, "You can't remove your own admin access. Ask another admin.");
  if (!on && (await adminCount()) <= 1) return fail(409, "There must always be at least one admin.");
  await db.transaction(async (tx) => {
    if (on) await tx.insert(s.userRoles).values({ userId: targetId, role: "admin" });
    else await tx.delete(s.userRoles).where(and(eq(s.userRoles.userId, targetId), eq(s.userRoles.role, "admin")));
    await audit(tx, user, {
      type: "permission",
      action: `${on ? "Gave" : "Removed"} admin access ${on ? "to" : "from"} ${target.name}`,
      targetType: "user",
      targetId: target.email,
      changes: [{ label: "Admin access", from: on ? "No" : "Yes", to: on ? "Yes" : "No" }],
    });
  });
  // Their open sessions pick up the change on their next request; taking access away also signs them out.
  if (!on) await endAllSessions(targetId);
  return { ok: true, value: { roles: on ? [...roles, "admin"] : roles.filter((r) => r !== "admin") } };
}

/** Deactivates (signs out everywhere and blocks logging in) or reactivates an account. */
export async function setActive(user: User, targetId: number, active: boolean): Promise<Outcome<{ active: boolean }>> {
  const [target] = await db.select().from(s.users).where(eq(s.users.id, targetId));
  if (!target) return fail(404, "We couldn't find that person.");
  if (!active && targetId === user.id) return fail(409, "You can't deactivate your own account.");
  const roles = (await db.select().from(s.userRoles).where(eq(s.userRoles.userId, targetId))).map((r) => r.role);
  if (!active && roles.includes("admin") && (await adminCount()) <= 1) return fail(409, "There must always be at least one active admin.");
  if (active === !target.disabledAt) return { ok: true, value: { active } };
  await db.transaction(async (tx) => {
    await tx.update(s.users).set({ disabledAt: active ? null : new Date() }).where(eq(s.users.id, targetId));
    await audit(tx, user, {
      type: "account",
      action: `${active ? "Reactivated" : "Deactivated"} ${target.name}`,
      targetType: "user",
      targetId: target.email,
      changes: [{ label: "Account", from: active ? "Deactivated" : "Active", to: active ? "Active" : "Deactivated" }],
    });
  });
  if (!active) await endAllSessions(targetId);
  return { ok: true, value: { active } };
}

/**
 * Adds an admin. A new email gets an account without a password: they set one with "Forgot password", which also
 * proves they own the email. An existing account just gains admin access.
 */
export async function inviteAdmin(user: User, nameIn: string, emailIn: string): Promise<Outcome<{ id: string; created: boolean }>> {
  const name = nameIn.trim().replace(/\s+/g, " ").slice(0, 120);
  const email = normEmail(emailIn);
  const errors: Record<string, string> = {};
  if (!name) errors.name = "Enter their name.";
  if (!validEmail(email)) errors.email = "Enter a valid email address.";
  if (Object.keys(errors).length) return fail(400, "Please check the details.", errors);
  let created = false;
  const id = await db.transaction(async (tx) => {
    let [account] = await tx.select({ id: s.users.id }).from(s.users).where(eq(s.users.email, email));
    if (!account) {
      [account] = await tx.insert(s.users).values({ email, name }).$returningId();
      await tx.insert(s.userRoles).values({ userId: account!.id, role: "customer" });
      created = true;
    }
    const [has] = await tx.select().from(s.userRoles).where(and(eq(s.userRoles.userId, account!.id), eq(s.userRoles.role, "admin")));
    if (!has) await tx.insert(s.userRoles).values({ userId: account!.id, role: "admin" });
    await audit(tx, user, {
      type: "permission",
      action: `Invited ${name} as an admin`,
      targetType: "user",
      targetId: email,
      changes: [{ label: "Admin access", from: "No", to: "Yes" }, ...(created ? [{ label: "Account", from: "—", to: "Created" }] : [])],
    });
    return account!.id;
  });
  return { ok: true, value: { id: String(id), created } };
}
