import type { ColorValue } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { bookingNotifications, staticNotifications } from "@core/notifications";
import { useBookings, useReadNotifications, useSession } from "@/lib/hooks";
import { homeForRole } from "@/lib/roles";
import { useView } from "@/lib/view";
import { colors, fonts } from "@/theme";

type Icon = keyof typeof Ionicons.glyphMap;

const icon = (active: Icon, idle: Icon) =>
  function TabIcon({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) {
    return <Ionicons name={focused ? active : idle} size={size} color={color as string} />;
  };

export default function TabsLayout() {
  const bookings = useBookings();
  const read = useReadNotifications();
  const user = useSession();
  const unread = [...bookingNotifications(bookings), ...staticNotifications].filter((n) => !read.includes(n.id)).length;

  // Staff, organizers and admins have their own areas. The customer tabs show only for customers, or for an account
  // that switched to its customer view.
  const view = useView(user?.email);
  if (user && view !== "customer") return <Redirect href={homeForRole(view)} />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.dim,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
        sceneStyle: { backgroundColor: colors.page },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: icon("home", "home-outline") }} />
      <Tabs.Screen name="events" options={{ title: "Events", tabBarIcon: icon("calendar", "calendar-outline") }} />
      <Tabs.Screen name="tickets" options={{ title: "Tickets", tabBarIcon: icon("ticket", "ticket-outline") }} />
      <Tabs.Screen
        name="alerts"
        options={{
          title: "Alerts",
          tabBarIcon: icon("notifications", "notifications-outline"),
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.danger, color: "#fff", fontFamily: fonts.bold, fontSize: 10 },
        }}
      />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: icon("person", "person-outline") }} />
    </Tabs>
  );
}
