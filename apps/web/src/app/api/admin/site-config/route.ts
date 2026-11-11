import { requireUser } from "@/server/auth";
import { saveSiteConfig } from "@/server/site";
import { readBody } from "../../auth/_body";

/** ADMIN ONLY: saves the site configuration (content, notices, platform settings). */
export async function PUT(req: Request) {
  const { user, error } = await requireUser("admin");
  if (error) return error;
  const config = (await readBody(req)).config;
  if (!config || typeof config !== "object") return Response.json({ error: "Nothing to save." }, { status: 400 });
  return Response.json({ config: await saveSiteConfig(user, config) });
}
