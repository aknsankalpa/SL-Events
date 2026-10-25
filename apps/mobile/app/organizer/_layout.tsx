import { Redirect, Stack } from "expo-router";
import { useSession } from "@/lib/hooks";
import { rolesFor } from "@/lib/roles";

/** Only accounts that hold the organizer role may open the organizer area. */
export default function OrganizerLayout() {
  const user = useSession();
  if (!rolesFor(user?.email).includes("organizer")) return <Redirect href="/login" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
