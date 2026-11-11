import { currentUser } from "@/server/auth";
import { submitApplication } from "@/server/applications";

/** The public "Become an organizer" form, sent as multipart form data (fields plus up to 5 files named "documents"). */
export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Send the application as a form." }, { status: 400 });
  }
  const field = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v : "";
  };
  const files = form.getAll("documents").filter((f): f is File => f instanceof File && f.size > 0);
  const user = await currentUser();
  const result = await submitApplication(
    { name: field("name"), email: field("email"), contact: field("contact"), organization: field("organization"), kind: field("kind"), about: field("about"), link: field("link"), files },
    user?.email ?? null,
  );
  if (!result.ok) return Response.json({ error: result.error, errors: result.errors, existingRef: result.existingRef }, { status: result.status });
  return Response.json({ application: result.value }, { status: 201 });
}
