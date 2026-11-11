// Applications to become an organizer, and the admin's decisions on them and on organizers. Server code only.
//
//   - Anyone can apply through the public form; attached files are stored privately (only admins open them).
//   - The status page needs both the reference and the email, so a reference alone reveals nothing.
//   - Approving creates the organizer and makes the applicant's account its owner (creating the account when the
//     email has none yet: they set a password with "Forgot password"). Suspending an organizer locks its people out of
//     the organizer portal. Every decision goes to the audit log.

import { randomInt } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { db, schema as s } from "@/db";
import type { AppStatus, OrganizerApp } from "@/lib/admin";
import type { Application, ApplicationStatus } from "@/lib/organizerApplications";
import { audit } from "./admin";
import type { AccountUser } from "./auth";
import { normEmail, validEmail } from "./auth";
import { readUpload, saveUpload, sniff } from "./storage";

type User = AccountUser & { id: number };
export type Outcome<T> = { ok: true; value: T } | { ok: false; status: number; error: string; errors?: Record<string, string> };
const fail = (status: number, error: string, errors?: Record<string, string>) => ({ ok: false as const, status, error, errors });

const OPEN: ApplicationStatus[] = ["received", "in_review", "more_info"];
const MAX_FILES = 5;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

type Row = typeof s.organizerApplications.$inferSelect;
const toPublic = (a: Row): Application => ({
  ref: a.ref,
  name: a.name,
  email: a.email,
  contact: a.contact ?? "",
  organization: a.organization,
  kind: a.kind,
  about: a.about,
  link: a.link ?? "",
  documents: (a.documents ?? []).map((d) => ({ name: d.name, size: d.size })),
  status: a.status,
  submittedAt: a.submittedAt.toISOString(),
  note: a.note ?? undefined,
});

/* ---------- the public side ---------- */

export type ApplicationInput = { name: string; email: string; contact: string; organization: string; kind: string; about: string; link: string; files: File[] };

/**
 * Saves an application. One open application per email: a second one is refused, and the reference is only told to
 * someone signed in with that email (anyone else could just be guessing addresses).
 */
export async function submitApplication(input: ApplicationInput, signedInEmail: string | null): Promise<Outcome<Application> & { existingRef?: string }> {
  const email = normEmail(input.email);
  const clean = (v: string, max: number) => v.trim().replace(/\s+/g, " ").slice(0, max);
  const errors: Record<string, string> = {};
  const name = clean(input.name, 120);
  const organization = clean(input.organization, 160);
  const about = input.about.trim().slice(0, 4000);
  if (!name) errors.name = "Enter your name.";
  if (!validEmail(email)) errors.email = "Enter a valid email address.";
  if (!organization) errors.organization = "Enter the name of your group, business or team.";
  if (about.length < 20) errors.about = "Tell us a little more: a sentence or two is enough.";
  if (input.files.length > MAX_FILES) errors.documents = `Attach up to ${MAX_FILES} files.`;
  const files: { file: File; bytes: Uint8Array; kind: NonNullable<ReturnType<typeof sniff>> }[] = [];
  for (const file of input.files) {
    if (errors.documents) break;
    if (file.size > MAX_FILE_BYTES) {
      errors.documents = `${file.name} is larger than 5 MB.`;
      break;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = sniff(bytes);
    if (!kind) errors.documents = `${file.name} isn't a PDF, PNG or JPG.`;
    else files.push({ file, bytes, kind });
  }
  if (Object.keys(errors).length) return fail(400, "Please check the highlighted details.", errors);

  const [open] = await db
    .select({ ref: s.organizerApplications.ref })
    .from(s.organizerApplications)
    .where(and(eq(s.organizerApplications.email, email), inArray(s.organizerApplications.status, OPEN)));
  if (open) {
    return {
      ...fail(409, "There's already an application for this email waiting for a decision."),
      existingRef: signedInEmail === email ? open.ref : undefined,
    };
  }

  for (let attempt = 0; ; attempt++) {
    const ref = `ORG-${randomInt(10000, 100000)}`;
    try {
      const documents = [];
      for (const f of files) {
        documents.push({ name: f.file.name.replace(/[\\/\r\n]/g, "_").slice(0, 160) || `document.${f.kind.ext}`, size: f.bytes.byteLength, path: await saveUpload(`applications/${ref}`, f.bytes, f.kind) });
      }
      await db.insert(s.organizerApplications).values({
        ref,
        name,
        email,
        contact: clean(input.contact, 120) || null,
        organization,
        kind: clean(input.kind, 60) || "Something else",
        about,
        link: clean(input.link, 255) || null,
        documents,
      });
      const [row] = await db.select().from(s.organizerApplications).where(eq(s.organizerApplications.ref, ref));
      return { ok: true, value: toPublic(row!) };
    } catch (e) {
      const dup = JSON.stringify(e, Object.getOwnPropertyNames(e)).includes("organizer_applications_ref_unique");
      if (!dup || attempt > 8) throw e;
    }
  }
}

/** The status page: needs the reference and the email that applied. */
export async function findApplication(ref: string, email: string): Promise<Application | undefined> {
  const [row] = await db
    .select()
    .from(s.organizerApplications)
    .where(and(eq(s.organizerApplications.ref, ref.trim().toUpperCase()), eq(s.organizerApplications.email, normEmail(email))));
  return row ? toPublic(row) : undefined;
}

/* ---------- the admin side ---------- */

const ADMIN_STATUS: Record<ApplicationStatus, AppStatus> = { received: "new", in_review: "new", more_info: "info_asked", approved: "approved", declined: "rejected" };
const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
const day = (d: Date) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Seoul" }).format(d);

function ago(d: Date) {
  const hours = Math.round((Date.now() - d.getTime()) / 3600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days < 30 ? `${days} day${days === 1 ? "" : "s"} ago` : `${Math.round(days / 30)} mo ago`;
}

const CHECKS = ["Name looks genuine", "Email works", "Past events look genuine", "Contact details checked"];

/**
 * Everything the admin's organizer page lists: applications (ids "app-<ref>") and organizers that are running or
 * suspended (ids "org-<id>"). An approved application shows its organizer's live status.
 */
export async function listOrganizerRows(): Promise<(OrganizerApp & { documents: { title: string; detail: string; url?: string }[] })[]> {
  const apps = await db.select().from(s.organizerApplications).orderBy(desc(s.organizerApplications.submittedAt));
  const orgs = await db.select().from(s.organizers);
  const owners = await db
    .select({ organizerId: s.organizerMembers.organizerId, name: s.users.name, email: s.users.email, phone: s.users.phone })
    .from(s.organizerMembers)
    .innerJoin(s.users, eq(s.users.id, s.organizerMembers.userId))
    .where(eq(s.organizerMembers.role, "owner"));
  const linked = new Set(apps.map((a) => a.organizerId).filter(Boolean));

  const fromApps = apps.map((a) => {
    const org = a.organizerId ? orgs.find((o) => o.id === a.organizerId) : undefined;
    return {
      id: `app-${a.ref}`,
      publicRef: a.ref,
      name: a.organization,
      initials: initials(a.organization),
      contact: a.name,
      email: a.email,
      phone: a.contact || "Not given",
      city: "—",
      kind: a.kind,
      registration: "—",
      expectedEvents: "—",
      about: a.about,
      applied: `Applied ${day(a.submittedAt)}`,
      ago: ago(a.submittedAt),
      status: org?.status === "suspended" ? ("suspended" as const) : ADMIN_STATUS[a.status],
      documents: (a.documents ?? []).map((d, i) => ({
        title: d.name,
        detail: `${d.size >= 1024 * 1024 ? `${(d.size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(d.size / 1024))} KB`} · attached to the application`,
        url: d.path ? `/api/admin/applications/${encodeURIComponent(a.ref)}/documents/${i}` : undefined,
      })),
      checks: CHECKS,
    };
  });
  const fromOrgs = orgs
    .filter((o) => !linked.has(o.id))
    .map((o) => {
      const owner = owners.find((x) => x.organizerId === o.id);
      return {
        id: `org-${o.id}`,
        name: o.name,
        initials: initials(o.name),
        contact: owner?.name ?? "No owner account yet",
        email: owner?.email ?? o.email ?? "—",
        phone: owner?.phone ?? o.phone ?? "Not given",
        city: "—",
        kind: "Organizer",
        registration: "—",
        expectedEvents: "—",
        about: o.about ?? "",
        applied: `Organizer since ${day(o.createdAt)}`,
        ago: ago(o.createdAt),
        status: (o.status === "suspended" ? "suspended" : "approved") as AppStatus,
        documents: [],
        checks: [],
      };
    });
  return [...fromApps, ...fromOrgs];
}

const LABEL: Record<AppStatus, string> = { new: "Waiting for decision", info_asked: "Info asked", approved: "Approved", rejected: "Rejected", suspended: "Suspended" };

async function uniqueOrgSlug(name: string) {
  const base =
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/[\s_-]+/g, "-")
      .slice(0, 100) || "organizer";
  for (let i = 0; i < 50; i++) {
    const slug = i ? `${base}-${i + 1}` : base;
    const [taken] = await db.select({ id: s.organizers.id }).from(s.organizers).where(eq(s.organizers.slug, slug));
    if (!taken) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/**
 * The admin's decision on a row of the organizer page: approve, ask for more information, reject, reopen, suspend or
 * reinstate. `note` is shown to the applicant for "info_asked" and "rejected".
 */
export async function decideOrganizer(user: User, id: string, status: AppStatus, note: string): Promise<Outcome<{ status: AppStatus; accountCreated?: boolean }>> {
  const text = note.trim().slice(0, 2000);
  if ((status === "info_asked" || status === "rejected") && !text) return fail(400, status === "rejected" ? "Write the reason so it is saved with the decision." : "Say what you need from them.");

  // An organizer that never applied through the form (added before the website existed): suspend or reinstate only.
  if (id.startsWith("org-")) {
    const orgId = Number(id.slice(4));
    const [org] = await db.select().from(s.organizers).where(eq(s.organizers.id, orgId));
    if (!org) return fail(404, "We couldn't find that organizer.");
    if (status !== "suspended" && status !== "approved") return fail(409, "This organizer can only be suspended or reinstated.");
    await setOrganizerStatus(user, org, status === "suspended" ? "suspended" : "active", text);
    return { ok: true, value: { status } };
  }

  const ref = id.replace(/^app-/, "");
  const [app] = await db.select().from(s.organizerApplications).where(eq(s.organizerApplications.ref, ref));
  if (!app) return fail(404, "We couldn't find that application.");
  const before: AppStatus = ADMIN_STATUS[app.status];

  if (status === "suspended" || (status === "approved" && app.organizerId)) {
    // Suspending, or reinstating, the organizer this application created.
    const [org] = app.organizerId ? await db.select().from(s.organizers).where(eq(s.organizers.id, app.organizerId)) : [];
    if (!org) return fail(409, "Only an approved organizer can be suspended.");
    await setOrganizerStatus(user, org, status === "suspended" ? "suspended" : "active", text);
    if (app.status !== "approved") await db.update(s.organizerApplications).set({ status: "approved", decidedBy: user.id, decidedAt: new Date() }).where(eq(s.organizerApplications.id, app.id));
    return { ok: true, value: { status } };
  }

  if (status === "approved") {
    let accountCreated = false;
    await db.transaction(async (tx) => {
      const [{ id: organizerId }] = await tx
        .insert(s.organizers)
        .values({ slug: await uniqueOrgSlug(app.organization), name: app.organization, about: app.about, email: app.email, link: app.link })
        .$returningId();
      let [account] = await tx.select({ id: s.users.id }).from(s.users).where(eq(s.users.email, app.email));
      if (!account) {
        // They set a password with "Forgot password", which also confirms they own the email.
        [account] = await tx.insert(s.users).values({ email: app.email, name: app.name }).$returningId();
        await tx.insert(s.userRoles).values({ userId: account!.id, role: "customer" });
        accountCreated = true;
      }
      const [hasRole] = await tx.select().from(s.userRoles).where(and(eq(s.userRoles.userId, account!.id), eq(s.userRoles.role, "organizer")));
      if (!hasRole) await tx.insert(s.userRoles).values({ userId: account!.id, role: "organizer" });
      await tx.insert(s.organizerMembers).values({ organizerId, userId: account!.id, role: "owner" });
      await tx.update(s.organizerApplications).set({ status: "approved", note: text || null, organizerId, decidedBy: user.id, decidedAt: new Date() }).where(eq(s.organizerApplications.id, app.id));
      await audit(tx, user, {
        type: "decision",
        action: `Approved organizer ${app.organization}`,
        targetType: "organizer_application",
        targetId: app.ref,
        changes: [{ label: "Status", from: LABEL[before], to: "Approved" }, ...(accountCreated ? [{ label: "Account", from: "—", to: `Created for ${app.email}` }] : [])],
      });
    });
    return { ok: true, value: { status, accountCreated } };
  }

  const next: ApplicationStatus = status === "info_asked" ? "more_info" : status === "rejected" ? "declined" : "in_review";
  if (app.status === "approved") return fail(409, "This application is already approved. Suspend the organizer instead.");
  await db.transaction(async (tx) => {
    await tx.update(s.organizerApplications).set({ status: next, note: next === "in_review" ? app.note : text, decidedBy: user.id, decidedAt: new Date() }).where(eq(s.organizerApplications.id, app.id));
    await audit(tx, user, {
      type: "decision",
      action: `${{ more_info: "Asked for more information from", declined: "Rejected organizer", in_review: "Reopened" }[next as "more_info" | "declined" | "in_review"]} ${app.organization}`,
      targetType: "organizer_application",
      targetId: app.ref,
      changes: [{ label: "Status", from: LABEL[before], to: LABEL[status] }, ...(text ? [{ label: next === "more_info" ? "Question" : "Reason", from: "—", to: text }] : [])],
    });
  });
  return { ok: true, value: { status } };
}

async function setOrganizerStatus(user: User, org: typeof s.organizers.$inferSelect, status: "active" | "suspended", note: string) {
  await db.transaction(async (tx) => {
    await tx.update(s.organizers).set({ status }).where(eq(s.organizers.id, org.id));
    await audit(tx, user, {
      type: "decision",
      action: `${status === "suspended" ? "Suspended" : "Reinstated"} organizer ${org.name}`,
      targetType: "organizer",
      targetId: org.id,
      changes: [{ label: "Status", from: org.status === "suspended" ? "Suspended" : "Active", to: status === "suspended" ? "Suspended" : "Active" }, ...(note ? [{ label: "Reason", from: "—", to: note }] : [])],
    });
  });
  // Their events disappear from (or come back to) the website on the next visit.
  try {
    revalidateTag("events", { expire: 0 });
  } catch {
    /* outside a request */
  }
}

/** An attached document, for admins only. */
export async function applicationDocument(ref: string, index: number) {
  const [app] = await db.select({ documents: s.organizerApplications.documents }).from(s.organizerApplications).where(eq(s.organizerApplications.ref, ref));
  const doc = app?.documents?.[index];
  if (!doc?.path) return null;
  const bytes = await readUpload(doc.path);
  return bytes ? { bytes, name: doc.name, type: doc.path.endsWith(".pdf") ? "application/pdf" : doc.path.endsWith(".png") ? "image/png" : "image/jpeg" } : null;
}
