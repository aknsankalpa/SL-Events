import type { NextRequest } from "next/server";
import { readMedia } from "@/server/storage";

/**
 * Public pictures (event covers, seating plans) stored by the website. Every stored file gets a new random name, so a
 * file never changes and browsers may keep it for a long time.
 */
export async function GET(_req: NextRequest, ctx: RouteContext<"/media/[...path]">) {
  const file = await readMedia((await ctx.params).path);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "content-type": file.type,
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
