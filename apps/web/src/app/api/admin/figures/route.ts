import { requireUser } from "@/server/auth";
import { platformFigures } from "@/server/dashboard";

/** ADMIN ONLY: platform totals for the admin dashboard and reports. */
export async function GET() {
  const { error } = await requireUser("admin");
  if (error) return error;
  return Response.json(await platformFigures());
}
