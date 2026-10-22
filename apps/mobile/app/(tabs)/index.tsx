import { Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { canIssueTickets, eventForBooking, ticketCount } from "@core/bookings";
import { categories, homeEvents, totalUpcomingEvents } from "@core/data";
import { recommend } from "@core/recommendations";
import { useBookings, useCustomerSettings, useSession } from "@/lib/hooks";
import { EventCover } from "@/ui/EventCover";
import { EventCard } from "@/ui/EventCard";
import { Screen } from "@/ui/Screen";
import { Text } from "@/ui/Text";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { colors, radius } from "@/theme";

export default function Home() {
  const user = useSession();
  const bookings = useBookings();
  const settings = useCustomerSettings(user?.email ?? "");

  // The next event the customer holds valid QR tickets for.
  const next = bookings
    .filter((b) => canIssueTickets(b) && b.status === "confirmed")
    .map((b) => ({ b, e: eventForBooking(b) }))
    .filter(({ e }) => !e.startsAt || new Date(e.startsAt).getTime() > Date.now())
    .sort((a, c) => new Date(a.e.startsAt || 0).getTime() - new Date(c.e.startsAt || 0).getTime())[0];

  const picks = user ? recommend(bookings, settings.city, 3) : [];

  return (
    <Screen topInset style={{ gap: 24 }}>
      <View style={{ gap: 4 }}>
        <Text variant="small" color={colors.gold} bold>
          {user ? `Welcome back, ${user.firstName}` : "SL Events · Korea"}
        </Text>
        <Text variant="display">{user ? "Find your next night out" : "Sri Lankan events in Korea"}</Text>
      </View>

      <Pressable
        accessibilityRole="search"
        accessibilityLabel="Search events"
        onPress={() => router.push("/events")}
        style={{ flexDirection: "row", alignItems: "center", gap: 10, height: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: 16 }}
      >
        <Ionicons name="search" size={18} color={colors.dim} />
        <Text color={colors.dim}>Search events, venues, cities</Text>
      </Pressable>

      {user ? (
        next ? (
          <Pressable accessibilityRole="button" onPress={() => router.push(`/booking/${next.b.id}/tickets` as never)}>
            <LinearGradient colors={["#8f1212", "#e0281f"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.lg, padding: 18, gap: 6, borderBottomWidth: 4, borderBottomColor: colors.amber }}>
              <Text variant="caption" color="rgba(255,255,255,0.8)" bold style={{ textTransform: "uppercase" }}>
                Your next event
              </Text>
              <Text variant="title" color="#fff">
                {next.e.title}
              </Text>
              <Text variant="small" color="rgba(255,255,255,0.9)">
                {next.e.dateLabel} · {next.e.venue}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
                <Ionicons name="qr-code" size={16} color="#fff" />
                <Text variant="label" color="#fff">
                  Show {ticketCount(next.b)} QR {ticketCount(next.b) === 1 ? "ticket" : "tickets"}
                </Text>
              </View>
            </LinearGradient>
          </Pressable>
        ) : (
          <Card style={{ gap: 8 }}>
            <Text variant="heading">No tickets yet</Text>
            <Text color={colors.muted}>When you book and your payment is confirmed, your QR tickets appear here.</Text>
          </Card>
        )
      ) : (
        <Card style={{ gap: 12 }}>
          <Text variant="heading">Book in a few taps</Text>
          <Text color={colors.muted}>Pay by bank transfer, upload your receipt, and keep your QR tickets on your phone.</Text>
          <Button title="Log in or create an account" onPress={() => router.push("/login")} small />
        </Card>
      )}

      <View style={{ gap: 12 }}>
        <Text variant="heading">Something for everyone</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {categories.map((c) => (
            <Pressable key={c.id} accessibilityRole="button" accessibilityLabel={c.label} onPress={() => router.push({ pathname: "/events", params: { category: c.id } })} style={{ alignItems: "center", gap: 8, width: 76 }}>
              <EventCover category={c.id} size={64} radius={radius.lg} />
              <Text variant="caption" color={colors.muted}>
                {c.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {picks.length > 0 && (
        <View style={{ gap: 12 }}>
          <Text variant="heading">Recommended for you</Text>
          {picks.map((p) => (
            <View key={p.event.slug} style={{ gap: 6 }}>
              <Text variant="small" color={colors.gold} bold>
                {p.reason}
              </Text>
              <EventCard event={p.event} />
            </View>
          ))}
        </View>
      )}

      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text variant="heading">Events near you</Text>
          <Text variant="small" color={colors.gold} bold onPress={() => router.push("/events")} accessibilityRole="link">
            See all {totalUpcomingEvents}
          </Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
          {homeEvents.map((e) => (
            <EventCard key={e.slug} event={e} compact />
          ))}
        </ScrollView>
      </View>
    </Screen>
  );
}
