import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { bookingNotifications, readStore, staticNotifications, type Notification } from "@core/notifications";
import { appHref } from "@/lib/links";
import { useBookings, useReadNotifications, useSession } from "@/lib/hooks";
import { Card } from "@/ui/Card";
import { EmptyState } from "@/ui/EmptyState";
import { Screen } from "@/ui/Screen";
import { SignInPrompt } from "@/ui/SignInPrompt";
import { Text } from "@/ui/Text";
import { colors, toneColor } from "@/theme";

const icons: Record<Notification["icon"], keyof typeof Ionicons.glyphMap> = {
  check: "checkmark-circle",
  alert: "alert-circle",
  hourglass: "hourglass",
  clock: "time",
  calendar: "calendar",
  sparkles: "sparkles",
  receipt: "receipt",
  megaphone: "megaphone",
};

export default function Alerts() {
  const user = useSession();
  const bookings = useBookings();
  const read = useReadNotifications();

  if (!user) {
    return (
      <Screen topInset>
        <Text variant="display">Alerts</Text>
        <SignInPrompt icon="notifications-outline" title="Log in to see your alerts" body="We tell you when payments are checked and tickets are ready." />
      </Screen>
    );
  }

  const all = [...bookingNotifications(bookings), ...staticNotifications];
  // Things the customer has to do come first, then unread, then the rest.
  const list = [...all].sort((a, b) => Number(!!b.attention) - Number(!!a.attention) || Number(read.includes(a.id)) - Number(read.includes(b.id)));
  const unread = all.filter((n) => !read.includes(n.id));

  const markRead = (ids: string[]) => readStore.update((cur) => [...new Set([...cur, ...ids])]);

  return (
    <Screen topInset>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text variant="display">Alerts</Text>
        {unread.length > 0 && (
          <Text variant="small" color={colors.gold} bold onPress={() => markRead(unread.map((n) => n.id))} accessibilityRole="button">
            Mark all read
          </Text>
        )}
      </View>
      {list.length === 0 ? (
        <EmptyState icon="notifications-outline" title="Nothing new" body="Updates about your bookings and events show up here." />
      ) : (
        list.map((n) => {
          const isRead = read.includes(n.id);
          const c = toneColor[n.tone];
          return (
            <Pressable
              key={n.id}
              accessibilityRole="button"
              accessibilityLabel={`${n.title}. ${n.body}`}
              onPress={() => {
                markRead([n.id]);
                if (n.action) router.push(appHref(n.action.href) as never);
              }}
            >
              <Card style={{ flexDirection: "row", gap: 12, opacity: isRead ? 0.7 : 1, borderColor: n.attention ? c + "88" : colors.line }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c + "22", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={icons[n.icon]} size={20} color={c} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text variant="heading" style={{ flex: 1 }}>
                      {n.title}
                    </Text>
                    {!isRead && <View accessibilityLabel="Unread" style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold }} />}
                  </View>
                  <Text variant="small" color={colors.muted}>
                    {n.body}
                  </Text>
                  <Text variant="caption" color={colors.dim}>
                    {n.time}
                    {n.action ? `  ·  ${n.action.label}` : ""}
                  </Text>
                </View>
              </Card>
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}
