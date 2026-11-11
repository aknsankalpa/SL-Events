import { NextResponse, type NextRequest } from "next/server";

/**
 * Lets the mobile app's browser preview (served from another address, e.g. http://192.168.0.10:8081) call the
 * website's API. The app signs in with a token ("Authorization: Bearer ..."), never with this site's cookies, and no
 * cookies are allowed across sites, so a page on another address can't act as a signed-in visitor of the website.
 *
 * In development any address may call the API. On the live site only the addresses in APP_ORIGINS (comma separated)
 * may; the installed iPhone and Android apps don't need this at all.
 */
const allowed = (process.env.APP_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const corsHeaders = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client",
  "Access-Control-Max-Age": "600",
};

export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";
  const ok = !!origin && (process.env.NODE_ENV !== "production" || allowed.includes(origin));

  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: { ...(ok ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}), ...corsHeaders } });
  }
  const response = NextResponse.next();
  if (ok) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
    for (const [k, v] of Object.entries(corsHeaders)) response.headers.set(k, v);
  }
  return response;
}

export const config = { matcher: "/api/:path*" };
