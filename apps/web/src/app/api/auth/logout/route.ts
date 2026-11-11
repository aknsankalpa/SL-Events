import { endSession } from "@/server/auth";

export async function POST() {
  await endSession();
  return Response.json({ ok: true });
}
