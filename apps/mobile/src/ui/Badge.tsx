import { StyleSheet, View } from "react-native";
import { statusMeta, type BookingStatus } from "@core/bookings";
import { toneColor } from "@/theme";
import { Text } from "./Text";

export function Badge({ label, tone = "neutral" }: { label: string; tone?: keyof typeof toneColor }) {
  const c = toneColor[tone];
  return (
    <View style={[styles.badge, { borderColor: c + "55", backgroundColor: c + "22" }]}>
      <Text variant="caption" color={c} bold style={{ textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}
      </Text>
    </View>
  );
}

export function StatusBadge({ status }: { status: BookingStatus }) {
  const m = statusMeta[status];
  return <Badge label={m.label} tone={m.tone} />;
}

const styles = StyleSheet.create({ badge: { alignSelf: "flex-start", borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 } });
