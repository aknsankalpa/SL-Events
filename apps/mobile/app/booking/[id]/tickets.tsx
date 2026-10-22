import { useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import { eventForBooking, ticketsFor } from "@core/bookings";
import { naverMapUrl } from "@core/calendar";
import { useBooking, useSession } from "@/lib/hooks";
import { openUrl } from "@/lib/rules";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { EmptyState } from "@/ui/EmptyState";
import { Screen } from "@/ui/Screen";
import { SignInPrompt } from "@/ui/SignInPrompt";
import { Text } from "@/ui/Text";
import { Badge } from "@/ui/Badge";
import { colors, radius } from "@/theme";

const tips = ["Have your ID ready. The name must match the ticket.", "Screenshots work, but only the first scan is accepted.", "Lost your phone? Staff can find your booking by email."];

/**
 * The QR tickets for one booking. `ticketsFor` returns nothing unless the payment rules allow tickets, so a booking
 * that is still unpaid or under review never shows a QR code here, whatever was typed into the phone's storage.
 */
export default function Tickets() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useSession();
  const booking = useBooking(id);
  const [index, setIndex] = useState(0);

  if (!user) {
    return (
      <Screen>
        <SignInPrompt icon="qr-code-outline" title="Log in to see your tickets" body="Tickets are private to the account that booked them." />
      </Screen>
    );
  }
  if (!booking) {
    return (
      <Screen>
        <EmptyState icon="receipt-outline" title="Booking not found" body="It may belong to another account." action="My tickets" onAction={() => router.replace("/tickets")} />
      </Screen>
    );
  }
  const tickets = ticketsFor(booking);
  if (tickets.length === 0) {
    return (
      <Screen>
        <EmptyState icon="lock-closed-outline" title="Tickets are not ready yet" body="QR tickets appear here once your payment is confirmed." action="See booking status" onAction={() => router.replace(`/booking/${booking.id}` as never)} />
      </Screen>
    );
  }

  const event = eventForBooking(booking);
  const t = tickets[Math.min(index, tickets.length - 1)]!;
  const go = (d: number) => setIndex((i) => (i + d + tickets.length) % tickets.length);

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable accessibilityLabel="Previous ticket" disabled={tickets.length < 2} onPress={() => go(-1)} style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", opacity: tickets.length < 2 ? 0.4 : 1 }}>
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </Pressable>
        <Text bold accessibilityLiveRegion="polite">
          Ticket {index + 1} of {tickets.length}
        </Text>
        <Pressable accessibilityLabel="Next ticket" disabled={tickets.length < 2} onPress={() => go(1)} style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", opacity: tickets.length < 2 ? 0.4 : 1 }}>
          <Ionicons name="chevron-forward" size={18} color={colors.text} />
        </Pressable>
      </View>

      <View accessibilityLabel={`Ticket for ${t.holder}`} style={{ borderRadius: radius.lg, overflow: "hidden", borderWidth: 1, borderColor: colors.gold + "80", backgroundColor: colors.surface }}>
        <View style={{ backgroundColor: "#b01818", padding: 20, gap: 6, borderBottomWidth: 4, borderBottomColor: colors.amber }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text variant="caption" color="rgba(255,255,255,0.8)" bold style={{ textTransform: "uppercase" }}>
              SL Events.kr
            </Text>
            <Text variant="caption" color="rgba(255,255,255,0.8)" bold style={{ textTransform: "uppercase" }}>
              Admit one
            </Text>
          </View>
          <Text variant="title" color="#fff">
            {event.title}
          </Text>
          <Text variant="small" color="rgba(255,255,255,0.9)">
            {event.dateLabel}
            {event.venue && event.slug ? ` · ${event.venue}` : ""}
          </Text>
        </View>
        <View style={{ alignItems: "center", gap: 14, padding: 22 }}>
          <View accessible accessibilityLabel={`QR code for ticket ${t.code}`} style={{ backgroundColor: "#fff", padding: 14, borderRadius: radius.md }}>
            <QRCode value={t.code} size={190} ecl="M" backgroundColor="#fff" color="#000" />
          </View>
          <Text selectable bold style={{ letterSpacing: 2, fontVariant: ["tabular-nums"] }}>
            {t.code}
          </Text>
          {t.scanned ? <Badge label="Already scanned" tone="neutral" /> : <Badge label="Valid" tone="success" />}
          <View style={{ width: "100%", gap: 2, alignItems: "center" }}>
            <Text variant="heading">{t.holder}</Text>
            <Text variant="small" color={colors.muted}>
              {t.ticketName} · Booking {booking.id}
            </Text>
          </View>
        </View>
      </View>

      <Card style={{ gap: 8 }}>
        <Text variant="heading">At the door</Text>
        {tips.map((tip) => (
          <View key={tip} style={{ flexDirection: "row", gap: 10 }}>
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.gold} style={{ marginTop: 2 }} />
            <Text variant="small" color={colors.muted} style={{ flex: 1 }}>
              {tip}
            </Text>
          </View>
        ))}
      </Card>
      {event.slug !== "" && <Button title="Get directions" variant="outline" icon={<Ionicons name="navigate-outline" size={16} color={colors.gold} />} onPress={() => openUrl(naverMapUrl(`${event.venue} ${event.area}`))} />}
    </Screen>
  );
}
