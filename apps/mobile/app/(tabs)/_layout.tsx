import type { ColorValue } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { bookingNotifications, staticNotifications } from "@core/notifications";
import { useBookings, useReadNotifications, useSession } from "@/lib/hooks";
import { staffFor } from "@/lib/roles";
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

  // Door staff have their own app area; a signed-in staff account never lands on the customer tabs.
  if (staffFor(user?.email)) return <Redirect href="/staff" />;

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
