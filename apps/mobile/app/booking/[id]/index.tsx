import { useEffect, useState } from "react";
import { Alert, Platform, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams } from "expo-router";
import { canIssueTickets, customerCan, eventForBooking, ticketSummary, type Booking } from "@core/bookings";
import { customerActions } from "@core/bookingStore";
import { paymentAccount } from "@core/data";
import { formatKrw } from "@core/format";
import { receiptNumber } from "@core/receipt";
import { useBooking, useSession } from "@/lib/hooks";
import { Button } from "@/ui/Button";
import { Card, Row } from "@/ui/Card";
import { StatusBadge } from "@/ui/Badge";
import { EmptyState } from "@/ui/EmptyState";
import { EventCover } from "@/ui/EventCover";
import { Screen } from "@/ui/Screen";
import { SignInPrompt } from "@/ui/SignInPrompt";
import { Text } from "@/ui/Text";
import { colors, radius } from "@/theme";

const pad = (n: number) => String(n).padStart(2, "0");
const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
};

function useCountdown(deadlineIso?: string) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!deadlineIso) return;
    const end = new Date(deadlineIso).getTime();
    const tick = () => setLeft(Math.max(0, end - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadlineIso]);
  return left;
}

function CopyRow({ label, value, copy }: { label: string; value: string; copy?: string }) {
  const [done, setDone] = useState(false);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 }}>
      <View style={{ flex: 1 }}>
        <Text variant="caption" color={colors.dim}>
          {label}
        </Text>
        <Text bold selectable>
          {value}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Copy ${label}`}
        onPress={async () => {
          await Clipboard.setStringAsync(copy ?? value);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        }}
        style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 12, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface2 }}
      >
        <Ionicons name={done ? "checkmark" : "copy-outline"} size={14} color={done ? colors.success : colors.text} />
        <Text variant="caption" bold>
          {done ? "Copied" : "Copy"}
        </Text>
      </Pressable>
    </View>
  );
}

function Notice({ tone, icon, title, body }: { tone: "success" | "warning" | "danger" | "neutral"; icon: keyof typeof Ionicons.glyphMap; title: string; body: string }) {
  const c = tone === "success" ? colors.success : tone === "warning" ? colors.warning : tone === "danger" ? colors.danger : colors.muted;
  return (
    <View accessibilityRole="alert" style={{ flexDirection: "row", gap: 12, padding: 16, borderRadius: radius.md, borderWidth: 1, borderColor: c + "66", backgroundColor: c + "1a" }}>
      <Ionicons name={icon} size={20} color={c} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text bold>{title}</Text>
        <Text variant="small" color={colors.muted}>
          {body}
        </Text>
      </View>
    </View>
  );
}

function confirm(title: string, message: string, action: string, run: () => void) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) run();
    return;
  }
  Alert.alert(title, message, [{ text: "Keep booking", style: "cancel" }, { text: action, style: "destructive", onPress: run }]);
}

function PaymentDetails({ booking }: { booking: Booking }) {
  const left = useCountdown(booking.payByIso);
  return (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.gold + "66", backgroundColor: colors.gold + "1a" }}>
        <Ionicons name="time-outline" size={18} color={colors.gold} />
        <Text variant="label" color={colors.gold} style={{ flex: 1 }}>
          Pay within
        </Text>
        <Text variant="heading" color={colors.gold} accessibilityLabel={left === null ? undefined : `${clock(left)} left`}>
          {left === null ? "--:--:--" : clock(left)}
        </Text>
      </View>
      <Card>
        <Text variant="heading" style={{ marginBottom: 4 }}>
          Bank transfer
        </Text>
        <CopyRow label="Bank" value={paymentAccount.bank} />
        <CopyRow label="Account number" value={paymentAccount.number} />
        <CopyRow label="Account holder" value={paymentAccount.holder} />
        <CopyRow label="Exact amount" value={formatKrw(booking.total)} copy={String(booking.total)} />
        <CopyRow label="Transfer memo" value={booking.id} />
      </Card>
      <Text variant="small" color={colors.muted}>
        Transfer the exact amount and write the booking number in the memo. Then upload a screenshot so we can check it. We check payments every day from 9 AM to 10 PM Korea time, usually within 2–6 hours.
      </Text>
    </>
  );
}

export default function BookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useSession();
  const booking = useBooking(id);

  if (!user) {
    return (
      <Screen>
        <SignInPrompt icon="receipt-outline" title="Log in to see this booking" body="Bookings are private to the account that made them." />
      </Screen>
    );
  }
  if (!booking) {
    return (
      <Screen>
        <EmptyState icon="receipt-outline" title="Booking not found" body="It may belong to another account, or the number is wrong." action="My tickets" onAction={() => router.replace("/tickets")} />
      </Screen>
    );
  }

  const event = eventForBooking(booking);
  const unpaid = booking.status === "awaiting_payment" || booking.status === "proof_rejected";
  const tickets = canIssueTickets(booking);

  return (
    <Screen>
      <Card style={{ flexDirection: "row", gap: 14, padding: 12 }}>
        <EventCover category={event.category} size={72} radius={radius.md} />
        <View style={{ flex: 1, gap: 4 }}>
          <StatusBadge status={booking.status} />
          <Text variant="heading" numberOfLines={2}>
            {booking.eventTitle}
          </Text>
          <Text variant="small" color={colors.muted}>
            {booking.eventDate}
            {event.venue && event.slug ? ` · ${event.venue}` : ""}
          </Text>
        </View>
      </Card>

      {booking.status === "awaiting_payment" && <Notice tone="warning" icon="time" title="Waiting for your payment" body="Your tickets are held for you. Pay and upload proof before the time runs out." />}
      {booking.status === "proof_rejected" && <Notice tone="danger" icon="alert-circle" title="Payment failed" body={booking.rejectionNote ?? "We could not match your payment. Upload a new screenshot."} />}
      {booking.status === "under_review" && <Notice tone="warning" icon="hourglass" title="We are checking your payment" body={booking.statusNote ?? "Usually checked within 2–6 hours."} />}
      {booking.status === "confirmed" && <Notice tone="success" icon="checkmark-circle" title={booking.total === 0 ? "You are booked" : "Payment confirmed"} body="Your QR tickets are ready. Show them at the door." />}
      {booking.status === "attended" && <Notice tone="success" icon="checkmark-done" title="You attended this event" body="Thanks for coming." />}
      {booking.status === "expired" && <Notice tone="neutral" icon="alert-circle" title="This booking expired" body="The payment time ran out and the tickets were released. You can book again if there are still tickets." />}
      {booking.status === "cancelled" && <Notice tone="neutral" icon="close-circle" title="Booking cancelled" body="The held tickets were released." />}

      {unpaid && <PaymentDetails booking={booking} />}

      {unpaid && customerCan.uploadProof(booking) && <Button title={booking.status === "proof_rejected" ? "Upload new proof" : "Upload payment proof"} icon={<Ionicons name="cloud-upload-outline" size={18} color={colors.ink} />} onPress={() => router.push(`/booking/${booking.id}/proof` as never)} />}
      {booking.status === "under_review" && booking.proof && (
        <Card>
          <Text variant="heading" style={{ marginBottom: 4 }}>
            Your proof
          </Text>
          <Row label="File" value={booking.proof.fileName} />
          <Row label="Sent" value={booking.proof.uploadedAt} />
          {booking.proof.sender && <Row label="Sender" value={booking.proof.sender} />}
        </Card>
      )}
      {tickets && <Button title="View QR tickets" icon={<Ionicons name="qr-code" size={18} color={colors.ink} />} onPress={() => router.push(`/booking/${booking.id}/tickets` as never)} />}

      <Card>
        <Text variant="heading" style={{ marginBottom: 4 }}>
          Booking details
        </Text>
        <Row label="Booking number" value={booking.id} />
        {booking.createdAt && <Row label="Booked" value={booking.createdAt} />}
        <Row label="Tickets" value={ticketSummary(booking)} />
        {booking.attendees.length > 0 && <Row label="Names" value={booking.attendees.join(", ")} />}
        {booking.fee > 0 && <Row label="Booking fee" value={formatKrw(booking.fee)} />}
        <Row label="Total" value={formatKrw(booking.total)} strong />
        <Row label="Payment" value={booking.paymentMethod} />
        {tickets && booking.total > 0 && <Row label="Receipt" value={receiptNumber(booking)} />}
      </Card>

      {customerCan.cancel(booking) && (
        <Text
          variant="small"
          color={colors.danger}
          center
          accessibilityRole="button"
          onPress={() =>
            confirm("Cancel this booking?", "Your held tickets go back on sale. This cannot be undone.", "Cancel booking", () => {
              customerActions.cancelBooking(booking.id);
            })
          }
        >
          Cancel this booking
        </Text>
      )}
      <Text variant="small" color={colors.dim} center onPress={() => router.push("/help")} accessibilityRole="link">
        Need help with this booking?
      </Text>
    </Screen>
  );
}
