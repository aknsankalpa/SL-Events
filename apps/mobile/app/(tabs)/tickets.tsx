import { useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { eventForBooking, ticketSummary, type Booking } from "@core/bookings";
import { formatKrw } from "@core/format";
import { useBookings, useSession } from "@/lib/hooks";
import { Card } from "@/ui/Card";
import { EmptyState } from "@/ui/EmptyState";
import { EventCover } from "@/ui/EventCover";
import { StatusBadge } from "@/ui/Badge";
import { Screen } from "@/ui/Screen";
import { SignInPrompt } from "@/ui/SignInPrompt";
import { Text } from "@/ui/Text";
import { colors, radius } from "@/theme";

type Filter = "all" | "active" | "past";
const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "past", label: "Past" },
];

const isActive = (b: Booking) => b.status === "confirmed" || b.status === "under_review" || b.status === "awaiting_payment" || b.status === "proof_rejected";

function nextStep(b: Booking): string | null {
  if (b.status === "awaiting_payment") return `Pay by ${b.payBy ?? "the deadline"}`;
  if (b.status === "proof_rejected") return "Payment failed. Upload new proof";
  if (b.status === "under_review") return "We are checking your payment";
  if (b.status === "confirmed") return "QR tickets ready";
  return null;
}

function BookingCard({ b }: { b: Booking }) {
  const event = eventForBooking(b);
  const step = nextStep(b);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${b.eventTitle}, booking ${b.id}`} onPress={() => router.push(`/booking/${b.id}` as never)} style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}>
      <Card style={{ flexDirection: "row", gap: 14, padding: 12 }}>
        <EventCover category={event.category} size={72} radius={radius.md} />
        <View style={{ flex: 1, gap: 4 }}>
          <StatusBadge status={b.status} />
          <Text variant="heading" numberOfLines={1}>
            {b.eventTitle}
          </Text>
          <Text variant="small" color={colors.muted} numberOfLines={1}>
            {b.eventDate} · {ticketSummary(b)}
          </Text>
          <Text variant="small" color={step && b.status !== "confirmed" ? colors.warning : colors.dim} numberOfLines={1}>
            {b.id} · {formatKrw(b.total)}
            {step ? ` · ${step}` : ""}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.dim} style={{ alignSelf: "center" }} />
      </Card>
    </Pressable>
  );
}

export default function Tickets() {
  const user = useSession();
  const bookings = useBookings();
  const [filter, setFilter] = useState<Filter>("all");

  if (!user) {
    return (
      <Screen topInset>
        <Text variant="display">My tickets</Text>
        <SignInPrompt icon="ticket-outline" title="Log in to see your tickets" body="Your bookings and QR tickets are saved to your account." />
      </Screen>
    );
  }

  const list = bookings.filter((b) => (filter === "all" ? true : filter === "active" ? isActive(b) : !isActive(b)));
  const attention = bookings.filter((b) => b.status === "awaiting_payment" || b.status === "proof_rejected").length;

  return (
    <Screen topInset>
      <Text variant="display">My tickets</Text>
      {attention > 0 && (
        <View accessibilityRole="alert" style={{ flexDirection: "row", gap: 10, alignItems: "center", padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.warning + "66", backgroundColor: colors.warning + "1a" }}>
          <Ionicons name="time-outline" size={18} color={colors.warning} />
          <Text variant="small" style={{ flex: 1 }}>
            {attention === 1 ? "1 booking needs" : `${attention} bookings need`} your attention to keep the tickets.
          </Text>
        </View>
      )}
      <View style={{ flexDirection: "row", gap: 8 }}>
        {filters.map((f) => (
          <Pressable
            key={f.id}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === f.id }}
            onPress={() => setFilter(f.id)}
            style={{ paddingHorizontal: 16, height: 36, borderRadius: radius.pill, borderWidth: 1, alignItems: "center", justifyContent: "center", borderColor: filter === f.id ? colors.gold : colors.line, backgroundColor: filter === f.id ? colors.gold + "22" : colors.surface }}
          >
            <Text variant="label" color={filter === f.id ? colors.gold : colors.muted}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {list.length === 0 ? (
        <EmptyState icon="ticket-outline" title={filter === "past" ? "No past events" : "No bookings yet"} body="Find an event you like and book your tickets." action="Browse events" onAction={() => router.push("/events")} />
      ) : (
        list.map((b) => <BookingCard key={b.id} b={b} />)
      )}
    </Screen>
  );
}
