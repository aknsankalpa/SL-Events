import { Redirect, Stack } from "expo-router";
import { useSession } from "@/lib/hooks";
import { rolesFor } from "@/lib/roles";

/** Only accounts that hold the admin role may open the admin area. */
export default function AdminLayout() {
  const user = useSession();
  if (!rolesFor(user?.email).includes("admin")) return <Redirect href="/login" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
