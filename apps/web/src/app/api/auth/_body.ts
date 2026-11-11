/** Reads a JSON body without throwing: a broken or missing body becomes an empty object. */
export async function readBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export const text = (v: unknown) => (typeof v === "string" ? v : "");
