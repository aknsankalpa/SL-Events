import { redirect } from "next/navigation";

/** The payment status now lives at /bookings/[id]. This keeps old links and bookmarks working. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/bookings/${id}`);
}
