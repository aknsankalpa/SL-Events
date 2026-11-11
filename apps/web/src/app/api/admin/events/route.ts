import { requireUser } from "@/server/auth";
import { listAdminEvents } from "@/server/admin";

/** ADMIN ONLY: every event on the platform with its status and sales. */
export async function GET() {
  const { error } = await requireUser("admin");
  if (error) return error;
  return Response.json({ events: await listAdminEvents() });
}
