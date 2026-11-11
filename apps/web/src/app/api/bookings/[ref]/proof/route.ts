import type { NextRequest } from "next/server";
import { requireUser } from "@/server/auth";
import { proofFile, submitProof } from "@/server/bookings";

/** Sends the transfer screenshot (multipart form: file, sender, bank, amount, date, time, note). */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/bookings/[ref]/proof">) {
  const { user, error } = await requireUser();
  if (error) return error;
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Send the proof as a form with the file attached." }, { status: 400 });
  }
  const field = (name: string) => {
    const v = form.get(name);
    return typeof v === "string" ? v : "";
  };
  const file = form.get("file");
  const result = await submitProof(user, (await ctx.params).ref, {
    file: file instanceof File ? file : null,
    sender: field("sender"),
    bank: field("bank"),
    amount: field("amount"),
    date: field("date"),
    time: field("time"),
    note: field("note"),
  });
  if (!result.ok) return Response.json({ error: result.error, errors: result.errors }, { status: result.status });
  return Response.json({ booking: result.value });
}

/** The latest screenshot, for the booking's owner or the event's staff. Never cached, never public. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/bookings/[ref]/proof">) {
  const { user, error } = await requireUser();
  if (error) return error;
  const file = await proofFile(user, (await ctx.params).ref);
  if (!file) return Response.json({ error: "No proof file to show." }, { status: 404 });
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "content-type": file.type,
      "content-disposition": `inline; filename="${file.name.replace(/[^\w.\- ]/g, "_")}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
