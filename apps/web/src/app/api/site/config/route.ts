import { getSiteConfig } from "@/server/site";

/** The public site configuration: banner, maintenance notice, payment account and other platform settings. */
export async function GET() {
  return Response.json({ config: await getSiteConfig() });
}
