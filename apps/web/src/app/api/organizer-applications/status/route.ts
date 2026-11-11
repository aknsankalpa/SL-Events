import type { NextRequest } from "next/server";
import { findApplication } from "@/server/applications";

/** The status page: `?ref=ORG-12345&email=...`. Both must match, so a reference alone reveals nothing. */
export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get("ref") ?? "";
  const email = req.nextUrl.searchParams.get("email") ?? "";
  const application = ref && email ? await findApplication(ref, email) : undefined;
  if (!application) return Response.json({ error: "We couldn't find an application with that reference and email." }, { status: 404 });
  return Response.json({ application });
}
