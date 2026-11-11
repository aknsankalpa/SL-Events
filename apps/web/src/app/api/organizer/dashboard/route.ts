import { organizerDashboard } from "@/server/dashboard";
import { requireOrganizer } from "@/server/organizer";

/** The organizer's dashboard figures: sales, money, payments waiting and recent bookings, for their own events. */
export async function GET() {
  const { user, org, error } = await requireOrganizer();
  if (error) return error;
  return Response.json(await organizerDashboard(user, org));
}
