import { useState } from "react";
import { Image, Modal, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { coverColors } from "@/theme";
import { useSession } from "@/lib/hooks";
import { staffFor } from "@/lib/roles";
import { notify } from "@/lib/notify";
import { staffEvent, staffEvents, type StaffEvent } from "@/staff/data";
import { selectEvent } from "@/staff/store";
import { useSummary } from "@/staff/summary";
import { ProgressBar } from "@/staff/ui";
import { Screen } from "@/ui/Screen";
import { Text } from "@/ui/Text";
import { colors, radius } from "@/theme";

const notices = [
  { id: "n1", title: "Doors open at 5:30 PM", body: "Sri Lankan Music Night · Hongdae Live Hall. Be at your door by 5:00 PM." },
  { id: "n2", title: "VIP tickets use the VIP entrance only", body: "Send VIP guests there. General tickets can't enter through it." },
];

function Chip({ icon, label, tone = "neutral" }: { icon?: keyof typeof Ionicons.glyphMap; label: string; tone?: "green" | "neutral" }) {
  const green = tone === "green";
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: green ? "#0f2a20" : colors.surface2, borderWidth: 1, borderColor: green ? colors.success + "44" : colors.line }}>
      {green ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success }} /> : icon ? <Ionicons name={icon} size={12} color={colors.muted} /> : null}
      <Text variant="caption" bold color={green ? colors.success : colors.muted} style={{ textTransform: "uppercase" }}>
        {label}
      </Text>
    </View>
  );
}

function TodayCard({ event }: { event: StaffEvent }) {
  const s = useSummary(event.id);
  const c = coverColors[event.category];
  return (
    <View style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: colors.gold + "55", backgroundColor: colors.surface, overflow: "hidden" }}>
      <LinearGradient colors={c} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 150, alignItems: "center", justifyContent: "center" }}>
        <View style={{ position: "absolute", top: 12, left: 12, backgroundColor: "#000", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
          <Text variant="caption" bold color={colors.gold} style={{ textTransform: "uppercase" }}>
            {event.category === "concert" ? "Concert" : event.category}
          </Text>
        </View>
        <Ionicons name={event.icon} size={58} color="#fff" />
      </LinearGradient>
      <View style={{ padding: 16, gap: 10 }}>
        <Text variant="title">{event.title}</Text>
        <Text variant="small" color={colors.muted}>
          {event.dateLabel} · {event.doorsLabel} · {event.venue}
        </Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <Chip label="Doors open" tone="green" />
          <Chip icon="business-outline" label={event.gate} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 4 }}>
          <Text>
            <Text style={{ fontSize: 30, lineHeight: 36 }} bold>
              {s?.checkedIn ?? 0}
            </Text>
            <Text variant="small" color={colors.muted}>
              {"  "}of {event.expected} checked in
            </Text>
          </Text>
          <Text variant="small" color={colors.muted}>
            {s?.percent ?? 0}%
          </Text>
        </View>
        <ProgressBar value={s?.checkedIn ?? 0} max={event.expected} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start scanning"
          onPress={() => {
            selectEvent(event.id);
            router.navigate("/staff/scan");
          }}
          style={{ marginTop: 6 }}
        >
          <LinearGradient colors={[colors.gold, colors.amber]} style={{ height: 52, borderRadius: radius.md, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <Ionicons name="scan-outline" size={20} color={colors.ink} />
            <Text bold color={colors.ink}>
              Start scanning
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

function Row({ event }: { event: StaffEvent }) {
  const c = coverColors[event.category];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${event.inLabel}`}
      onPress={() => notify(`${event.title}`, `Scanning opens on event day (${event.dateLabel}). You're posted at the ${event.gate}.`)}
      style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg }}
    >
      <LinearGradient colors={[c[0], c[2]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 52, height: 52, borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={event.icon} size={22} color="#fff" />
      </LinearGradient>
      <View style={{ flex: 1, gap: 3 }}>
        <Text bold numberOfLines={2}>
          {event.title}
        </Text>
        <Text variant="small" color={colors.muted}>
          {event.dateLabel} · {event.doorsLabel}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="business-outline" size={12} color={colors.dim} />
          <Text variant="small" color={colors.dim}>
            {event.gate}
          </Text>
        </View>
      </View>
      <View style={{ backgroundColor: colors.surface2, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
        <Text variant="caption" bold color={colors.muted} style={{ textTransform: "uppercase" }}>
          {event.inLabel}
        </Text>
      </View>
    </Pressable>
  );
}

export default function StaffEvents() {
  const user = useSession();
  const staff = staffFor(user?.email);
  const [bell, setBell] = useState(false);
  if (!staff) return null;

  const mine = staff.events.map(staffEvent).filter(Boolean) as StaffEvent[];
  const today = mine.filter((e) => e.phase === "today");
  const upcoming = mine.filter((e) => e.phase === "upcoming");
  const past = mine.filter((e) => e.phase === "past");

  return (
    <Screen topInset bottom={36} style={{ gap: 18 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Image source={require("../../../assets/logo.jpg")} style={{ width: 96, height: 40 }} resizeMode="contain" accessibilityLabel="SL Events" />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Notices" onPress={() => setBell(true)} hitSlop={10}>
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
            <View style={{ position: "absolute", top: -2, right: -2, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.danger }} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Account" onPress={() => router.push("/staff/account")} style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.gold + "99", backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center" }}>
            <Text variant="label" color={colors.gold}>
              {staff.initials}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={{ gap: 4 }}>
        <Text variant="display" style={{ fontSize: 32, lineHeight: 38 }}>
          Hi {staff.firstName}
        </Text>
        <Text variant="small" color={colors.muted}>
          {staff.roleLabel} · {staff.organizer}
        </Text>
      </View>

      {today.length > 0 && (
        <View style={{ gap: 10 }}>
          <Text variant="caption" bold color={colors.muted} style={{ letterSpacing: 1, textTransform: "uppercase" }}>
            Today
          </Text>
          {today.map((e) => (
            <TodayCard key={e.id} event={e} />
          ))}
        </View>
      )}

      {upcoming.length > 0 && (
        <View style={{ gap: 10 }}>
          <Text variant="caption" bold color={colors.muted} style={{ letterSpacing: 1, textTransform: "uppercase" }}>
            Upcoming
          </Text>
          {upcoming.map((e) => (
            <Row key={e.id} event={e} />
          ))}
        </View>
      )}

      {past.length > 0 && (
        <View style={{ gap: 10 }}>
          <Text variant="caption" bold color={colors.muted} style={{ letterSpacing: 1, textTransform: "uppercase" }}>
            Past
          </Text>
          {past.map((e) => (
            <Pressable
              key={e.id}
              accessibilityRole="button"
              accessibilityLabel={`${e.title}, past event`}
              onPress={() => {
                selectEvent(e.id);
                router.navigate("/staff/summary");
              }}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg }}
            >
              <Ionicons name="calendar-outline" size={20} color={colors.muted} />
              <View style={{ flex: 1 }}>
                <Text bold>{e.title}</Text>
                <Text variant="small" color={colors.muted}>
                  {e.dateLabel} · {e.base.checkedIn} of {e.expected} checked in
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.dim} />
            </Pressable>
          ))}
        </View>
      )}

      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <Ionicons name="lock-closed-outline" size={14} color={colors.dim} />
        <Text variant="small" color={colors.dim} style={{ flex: 1 }}>
          You can only scan events your organizer assigned to you.
        </Text>
      </View>

      <Modal visible={bell} transparent animationType="fade" onRequestClose={() => setBell(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-start", paddingTop: 90, paddingHorizontal: 20 }} onPress={() => setBell(false)} accessibilityLabel="Close notices">
          <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 14 }}>
            <Text variant="heading">Notices from your organizer</Text>
            {notices.map((n) => (
              <View key={n.id} style={{ gap: 2 }}>
                <Text bold>{n.title}</Text>
                <Text variant="small" color={colors.muted}>
                  {n.body}
                </Text>
              </View>
            ))}
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}
