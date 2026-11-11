import { currentUser } from "@/server/auth";

/** Who is signed in on this browser or app, or null. */
export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ user: null });
  const { id: _id, ...rest } = user;
  void _id;
  return Response.json({ user: rest });
}
