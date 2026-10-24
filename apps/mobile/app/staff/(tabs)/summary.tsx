import { useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNow } from "@/lib/hooks";
import { useSession } from "@/lib/hooks";
import { staffFor } from "@/lib/roles";
import { outcomeMeta, staffEvent } from "@/staff/data";
import { useConnection } from "@/staff/hooks";
import { useStaffState } from "@/staff/store";
import { useSummary } from "@/staff/summary";
import { pillTone, ProgressBar, StaffHeader, StatTile } from "@/staff/ui";
import { Screen } from "@/ui/Screen";
import { Text } from "@/ui/Text";
import { colors, radius } from "@/theme";

const panel = { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: 16, gap: 14 } as const;

export default function Summary() {
  const user = useSession();
  const staff = staffFor(user?.email);
  const { eventId } = useStaffState();
  const event = staffEvent(eventId);
  const s = useSummary(eventId);
  const { online } = useConnection();
  const now = useNow();
  const [filter, setFilter] = useState<"all" | "rejected">("all");
  if (!staff || !event || !s) return null;

  const updated = new Date(now).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: "Asia/Seoul" });
  const rows = s.recent.filter((r) => filter === "all" || outcomeMeta[r.outcome].refused).slice(0, 12);

  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      <StaffHeader title="Attendance" subtitle={event.title} online={online} left={null} />
      <Screen padded bottom={36} style={{ gap: 14 }}>
        <View accessibilityLiveRegion="polite" style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: radius.md, borderWidth: 1, borderColor: online ? colors.success + "55" : "#ff6b6b66", backgroundColor: online ? "#0f2a20" : "#2a0f0f" }}>
          <Ionicons name={online ? "wifi" : "cloud-offline-outline"} size={16} color={online ? colors.success : "#ff6b6b"} />
          <Text variant="small" color={online ? colors.success : "#ff6b6b"}>
            {online ? `Connected · updated ${updated}` : "Offline · numbers may be out of date"}
          </Text>
        </View>

        <View style={{ ...panel, borderColor: colors.gold + "55", gap: 10 }}>
          <Text variant="small" color={colors.muted}>
            Checked in
          </Text>
          <Text>
            <Text style={{ fontSize: 44, lineHeight: 50 }} bold>
              {s.checkedIn}
            </Text>
            <Text color={colors.muted}>
              {"  "}of {s.expected} tickets
            </Text>
          </Text>
          <ProgressBar value={s.checkedIn} max={s.expected} />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text variant="small" color={colors.muted}>
              {s.percent}% arrived
            </Text>
            <Text variant="small" color={colors.muted}>
              Doors opened {event.doorsOpened}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <StatTile label="Still to arrive">
            <Text variant="title">{s.stillToArrive}</Text>
          </StatTile>
          <StatTile label="Rejected">
            <Text variant="title">{s.rejected}</Text>
          </StatTile>
          <StatTile label="Per minute">
            <Text variant="title">{s.perMinute}</Text>
          </StatTile>
        </View>

        {s.byType.length > 0 && (
          <View style={panel}>
            <Text variant="heading">By ticket type</Text>
            {s.byType.map((t) => (
              <View key={t.label} style={{ gap: 6 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text bold>{t.label}</Text>
                  <Text variant="small" color={colors.muted}>
                    {t.in}
                    {t.of ? `/${t.of}` : ""}
                  </Text>
                </View>
                <ProgressBar value={t.in} max={t.of || t.in} height={7} />
              </View>
            ))}
          </View>
        )}

        {s.byGate.length > 0 && (
          <View style={panel}>
            <Text variant="heading">By entrance</Text>
            {s.byGate.map((g) => (
              <View key={g.label} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View>
                  <Text bold>{g.label}</Text>
                  {g.staff ? (
                    <Text variant="small" color={colors.muted}>
                      {g.staff}
                    </Text>
                  ) : null}
                </View>
                <Text variant="title">{g.in}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={panel}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text variant="heading">Recent scans</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(["all", "rejected"] as const).map((f) => (
                <Pressable key={f} accessibilityRole="button" accessibilityState={{ selected: filter === f }} onPress={() => setFilter(f)} style={{ paddingHorizontal: 14, height: 32, borderRadius: 999, borderWidth: 1, alignItems: "center", justifyContent: "center", borderColor: filter === f ? colors.gold : colors.line, backgroundColor: filter === f ? colors.gold : "transparent" }}>
                  <Text variant="label" color={filter === f ? colors.ink : colors.muted}>
                    {f === "all" ? "All" : "Rejected"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          {rows.length === 0 ? (
            <Text color={colors.muted}>{filter === "rejected" ? "No rejected scans." : "No scans yet."}</Text>
          ) : (
            rows.map((r, i) => (
              <View key={r.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingTop: i === 0 ? 0 : 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.line }}>
                <View style={{ width: 74, alignItems: "center", paddingVertical: 5, borderRadius: 999, backgroundColor: pillTone[r.outcome].bg }}>
                  <Text variant="caption" bold color={pillTone[r.outcome].fg} style={{ textTransform: "uppercase" }}>
                    {outcomeMeta[r.outcome].short}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text bold numberOfLines={1}>
                    {r.name}
                  </Text>
                  <Text variant="small" color={colors.muted} numberOfLines={1}>
                    {r.ticket} · {r.gate}
                  </Text>
                </View>
                <Text variant="small" color={colors.muted}>
                  {r.time}
                </Text>
              </View>
            ))
          )}
        </View>
      </Screen>
    </View>
  );
}
