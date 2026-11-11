import { requireUser } from "@/server/auth";
import { listOrganizerRows } from "@/server/applications";

/** ADMIN ONLY: applications and organizers, as the organizer approval page lists them. */
export async function GET() {
  const { error } = await requireUser("admin");
  if (error) return error;
  return Response.json({ rows: await listOrganizerRows() });
}
