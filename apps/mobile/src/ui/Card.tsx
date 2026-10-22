import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from "react-native";
import { colors, radius } from "@/theme";
import { Text } from "./Text";

export function Card({ style, ...rest }: ViewProps & { style?: StyleProp<ViewStyle> }) {
  return <View {...rest} style={[styles.card, style]} />;
}

/** A label on the left and a value on the right, for summaries and receipts. */
export function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text variant="small" color={colors.muted}>
        {label}
      </Text>
      <Text variant="small" bold={strong} style={{ flexShrink: 1, textAlign: "right" }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg, padding: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 16, paddingVertical: 6 },
});
