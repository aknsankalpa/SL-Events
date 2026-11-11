import { requireUser } from "@/server/auth";
import { staffHome } from "@/server/staffApp";

/** For the app's door-staff screens: who you are, the events you check tickets in for, and their numbers so far. */
export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;
  const home = await staffHome(user);
  if (!home) return Response.json({ error: "This account isn't on a door team. Ask your event organizer to add you." }, { status: 403 });
  return Response.json(home);
}
