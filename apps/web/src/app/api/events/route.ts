import { listEvents } from "@/server/events";

/** Every event customers can browse, soonest first (no seat charts). Used by the mobile app. */
export async function GET() {
  return Response.json({ events: await listEvents() });
}
