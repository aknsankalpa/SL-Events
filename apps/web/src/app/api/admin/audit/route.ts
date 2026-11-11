import { requireUser } from "@/server/auth";
import { listAudit, recordAudit, type AuditChange } from "@/server/admin";
import { readBody, text } from "../../auth/_body";

/** ADMIN ONLY: the newest audit log entries. */
export async function GET() {
  const { error } = await requireUser("admin");
  if (error) return error;
  return Response.json({ entries: await listAudit() });
}

/** ADMIN ONLY: records an action taken in the browser (an export, for example) in the signed-in admin's name. */
export async function POST(req: Request) {
  const { user, error } = await requireUser("admin");
  if (error) return error;
  const body = await readBody(req);
  if (!text(body.action).trim()) return Response.json({ error: "Say what happened." }, { status: 400 });
  await recordAudit(user, {
    type: text(body.type),
    action: text(body.action),
    item: text(body.item) || "item",
    changes: Array.isArray(body.changes) ? (body.changes as AuditChange[]) : undefined,
  });
  return Response.json({ ok: true }, { status: 201 });
}
