import { Redirect, Tabs } from "expo-router";
import { useSession } from "@/lib/hooks";
import { staffFor } from "@/lib/roles";
import { StaffTabBar } from "@/staff/ui";
import { colors } from "@/theme";

export default function StaffTabs() {
  const user = useSession();
  // Only accounts on a door-staff team get in. Anyone else goes to the staff sign-in.
  if (!staffFor(user?.email)) return <Redirect href="/staff/login" />;

  return (
    <Tabs tabBar={(props) => <StaffTabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.page } }}>
      <Tabs.Screen name="index" options={{ title: "Events" }} />
      <Tabs.Screen name="scan" options={{ title: "Scan" }} />
      <Tabs.Screen name="summary" options={{ title: "Summary" }} />
    </Tabs>
  );
}
