import { useEffect, useState } from "react";
import { Linking, Pressable, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useSession } from "@/lib/hooks";
import { notify } from "@/lib/notify";
import { staffFor } from "@/lib/roles";
import { ruleFor, staffEvent, type Outcome } from "@/staff/data";
import { useConnection } from "@/staff/hooks";
import { resultById, scanRequests, selectGate, type ScanResult } from "@/staff/store";
import { outcomeLook, StaffHeader } from "@/staff/ui";
import { Screen } from "@/ui/Screen";
import { Text } from "@/ui/Text";
import { colors, radius } from "@/theme";

const AUTO_SECONDS = 3;

const messages = (r: ScanResult, gate: string): string => {
  const rule = ruleFor(r.ticket);
  const table: Record<Outcome, string> = {
    admit: "Ticket is valid for this event.",
    already_used: "This ticket was already scanned. A copy may be in use.",
    invalid: "This QR code is not an SL Events ticket, or it has been changed.",
    wrong_entrance: rule.gate ? `This is a ${r.ticket} ticket. Please send the guest to the ${rule.gate}.` : `${r.ticket} tickets can't use the ${gate}. Please send the guest to another door.`,
    wrong_event: `This ticket is for ${r.otherEvent ?? "another event"}.`,
    not_paid: "Payment for this booking hasn't been confirmed, so the ticket isn't active.",
    cancelled: "This ticket was cancelled.",
  };
  return table[r.outcome];
};

const rowsFor = (r: ScanResult): [string, string, boolean?][] => {
  const base: [string, string][] = [["Name", r.name], ["Ticket", r.ticket]];
  switch (r.outcome) {
    case "admit":
      return [...base, ["Area", r.area ?? "—"], ["Ticket code", r.code, true]];
    case "already_used":
      return [...base, ["First scanned", r.firstScan ? `${r.firstScan.time} · ${r.firstScan.gate}` : "—"], ["Scanned by", r.firstScan?.by ?? "—"]];
    case "wrong_entrance":
      return [...base, ["Allowed at", r.allowedAt ?? "—"]];
    case "not_paid":
      return [...base, ["Booking", `${r.booking} · awaiting payment`]];
    case "cancelled":
      return [...base, ["Cancelled", r.cancelledOn ?? "—"]];
    case "wrong_event":
      return [...base, ["Event", r.otherEvent ?? "—"]];
    default:
      return [];
  }
};

const verdict: Record<Outcome, { text: string; icon: "person-circle-outline" | "ban-outline" }> = {
  admit: { text: "Admit 1 person", icon: "person-circle-outline" },
  already_used: { text: "Do not admit", icon: "ban-outline" },
  invalid: { text: "Do not admit", icon: "ban-outline" },
  wrong_entrance: { text: "Do not admit at this door", icon: "ban-outline" },
  wrong_event: { text: "Do not admit", icon: "ban-outline" },
  not_paid: { text: "Do not admit until payment is confirmed", icon: "ban-outline" },
  cancelled: { text: "Do not admit", icon: "ban-outline" },
};

export default function Result() {
  const { event: eventId = "", id = "" } = useLocalSearchParams<{ event?: string; id?: string }>();
  const user = useSession();
  const staff = staffFor(user?.email);
  const { online } = useConnection();
  const r = resultById(eventId, id);
  const [left, setLeft] = useState(AUTO_SECONDS);

  const admitted = r?.outcome === "admit";
  useEffect(() => {
    if (!admitted) return;
    const t = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [admitted]);
  useEffect(() => {
    if (admitted && left <= 0) router.back();
  }, [admitted, left]);

  if (!staff) return <Redirect href="/staff/login" />;
  if (!r) return <Redirect href="/staff/scan" />;

  const event = staffEvent(eventId);
  const look = outcomeLook[r.outcome];
  const t = look.tone;
  const v = verdict[r.outcome];
  const next = () => router.back();

  const secondary =
    r.outcome === "invalid"
      ? { label: "Type the code instead", run: () => { scanRequests.typeCode = true; router.back(); } }
      : r.outcome === "wrong_entrance" && ruleFor(r.ticket).gate
        ? { label: `Switch to ${ruleFor(r.ticket).gate}`, run: () => { selectGate(ruleFor(r.ticket).gate!); router.back(); } }
        : r.outcome === "cancelled"
          ? { label: "Send to help desk", run: () => notify("Send the guest to the help desk", "They can ask about this cancelled ticket there.") }
          : r.outcome === "admit"
            ? null
            : { label: "Call organizer", run: () => Linking.openURL(`tel:${staff.organizerContact.phone.replace(/[^\d+]/g, "")}`).catch(() => undefined) };

  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      <StaffHeader title={event?.title ?? "Scan result"} subtitle={`${r.gate} · ${staff.firstName}`} online={online} left="close" />
      <Screen fixed style={{ gap: 16, flex: 1 }}>
        <View accessibilityRole="alert" accessibilityLabel={`${look.title}. ${messages(r, r.gate)}`} style={{ borderRadius: radius.lg, borderWidth: 2, borderColor: t.border, backgroundColor: t.bg, alignItems: "center", paddingVertical: 26, paddingHorizontal: 20, gap: 10 }}>
          <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: t.circle, alignItems: "center", justifyContent: "center" }}>
            <MaterialCommunityIcons name={look.icon} size={44} color={colors.ink} />
          </View>
          <Text style={{ fontSize: 26, lineHeight: 32, letterSpacing: 0.5, textTransform: "uppercase" }} bold color={t.title}>
            {look.title}
          </Text>
          <Text center color={colors.text}>
            {messages(r, r.gate)}
          </Text>
        </View>

        {r.outcome === "invalid" ? (
          <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: 16, gap: 10 }}>
            <Text variant="heading">What to do</Text>
            {["Ask the guest to open the ticket in the SL Events app or email.", "If the screen is cracked or dim, type the code instead.", "Send them to the help desk if it still fails."].map((s) => (
              <View key={s} style={{ flexDirection: "row", gap: 10 }}>
                <Ionicons name="chevron-forward" size={14} color={colors.amber} style={{ marginTop: 3 }} />
                <Text variant="small" color={colors.muted} style={{ flex: 1 }}>
                  {s}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, paddingHorizontal: 16 }}>
            {rowsFor(r).map(([k, val, mono], i) => (
              <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, paddingVertical: 14, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.line }}>
                <Text variant="small" color={colors.muted}>
                  {k}
                </Text>
                <Text bold style={[{ flexShrink: 1, textAlign: "right" }, mono && { fontVariant: ["tabular-nums"], letterSpacing: 0.5 }]}>
                  {val}
                </Text>
              </View>
            ))}
          </View>
        )}

        {admitted && r.bookingProgress && (
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <Ionicons name="information-circle-outline" size={14} color={colors.muted} />
            <Text variant="small" color={colors.muted} style={{ flex: 1 }}>
              {r.bookingProgress.checked} of {r.bookingProgress.total} {r.bookingProgress.total === 1 ? "ticket" : "tickets"} in this booking {r.bookingProgress.checked === 1 ? "is" : "are"} now checked in.
            </Text>
          </View>
        )}

        <View accessibilityRole="alert" style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 16, borderRadius: radius.md, borderWidth: 1, borderColor: t.verdictBorder, backgroundColor: t.verdictBg }}>
          <Ionicons name={v.icon} size={20} color={t.title} />
          <Text bold color={t.title} style={{ flex: 1 }}>
            {v.text}
          </Text>
        </View>

        <View style={{ flex: 1 }} />

        {admitted ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Scan next" onPress={next}>
            <LinearGradient colors={[colors.gold, colors.amber]} style={{ height: 56, borderRadius: radius.md, alignItems: "center", justifyContent: "center" }}>
              <Text bold color={colors.ink}>
                Scan next · auto in {Math.max(0, left)} s
              </Text>
            </LinearGradient>
          </Pressable>
        ) : (
          <Pressable accessibilityRole="button" accessibilityLabel="Scan next" onPress={next} style={{ height: 56, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", backgroundColor: "#000" }}>
            <Text bold>Scan next</Text>
          </Pressable>
        )}
        {secondary && (
          <Text bold color={colors.muted} center onPress={secondary.run} accessibilityRole="button" style={{ paddingVertical: 10 }}>
            {secondary.label}
          </Text>
        )}
      </Screen>
    </View>
  );
}
