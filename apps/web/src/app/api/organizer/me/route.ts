import { requireOrganizer } from "@/server/organizer";

/** The organizer the signed-in account manages, and their role in it. */
export async function GET() {
  const { org, error } = await requireOrganizer();
  if (error) return error;
  return Response.json({ organizer: org });
}
