import { useEffect } from "react";
import { Redirect, Tabs } from "expo-router";
import { useSession } from "@/lib/hooks";
import { useStaffHome } from "@/staff/data";
import { selectEvent, useStaffState } from "@/staff/store";
import { StaffTabBar } from "@/staff/ui";
import { Loading } from "@/ui/Loading";
import { colors } from "@/theme";

export default function StaffTabs() {
  const user = useSession();
  const { profile, events, loaded } = useStaffHome(user?.email);
  const { eventId } = useStaffState();

  // Work today's event unless this phone already chose one the person is still on.
  useEffect(() => {
    if (!events.length || events.some((e) => e.id === eventId)) return;
    const pick = events.find((e) => e.phase === "today") ?? events.find((e) => e.phase === "upcoming") ?? events[0]!;
    selectEvent(pick.id);
  }, [events, eventId]);

  // Only accounts on a door-staff team (or an organizer's team) get in. Anyone else goes to the staff sign-in.
  if (!user) return <Redirect href="/staff/login" />;
  if (!loaded) return <Loading label="Loading your events…" />;
  if (!profile) return <Redirect href="/staff/login" />;

  return (
    <Tabs tabBar={(props) => <StaffTabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.page } }}>
      <Tabs.Screen name="index" options={{ title: "Events" }} />
      <Tabs.Screen name="scan" options={{ title: "Scan" }} />
      <Tabs.Screen name="summary" options={{ title: "Summary" }} />
    </Tabs>
  );
}
