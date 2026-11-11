import { getProfile, requireOrganizer, saveProfile } from "@/server/organizer";
import { readBody } from "../../auth/_body";

/** The signed-in organizer's profile: their own details and their organization's. */
export async function GET() {
  const { user, org, error } = await requireOrganizer();
  if (error) return error;
  return Response.json({ profile: await getProfile(user, org) });
}

/** Saves the profile. Only the owner can change the payout account. */
export async function PUT(req: Request) {
  const { user, org, error } = await requireOrganizer();
  if (error) return error;
  const result = await saveProfile(user, org, (await readBody(req)).profile as never);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ profile: result.value });
}
