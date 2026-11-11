import type { NextRequest } from "next/server";
import { requireUser } from "@/server/auth";
import { applicationDocument } from "@/server/applications";

/** ADMIN ONLY: a file attached to an organizer application. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/admin/applications/[ref]/documents/[index]">) {
  const { error } = await requireUser("admin");
  if (error) return error;
  const { ref, index } = await ctx.params;
  const doc = /^\d{1,2}$/.test(index) ? await applicationDocument(decodeURIComponent(ref), Number(index)) : null;
  if (!doc) return Response.json({ error: "That file isn't available." }, { status: 404 });
  return new Response(new Uint8Array(doc.bytes), {
    headers: {
      "content-type": doc.type,
      "content-disposition": `inline; filename="${doc.name.replace(/[^\w.\- ]/g, "_")}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
