import { ActivityIndicator, View } from "react-native";
import { Text } from "./Text";
import { colors } from "@/theme";

/** A full-screen "loading" state while the app waits for the website. */
export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: colors.page, padding: 24 }}>
      <ActivityIndicator color={colors.gold} />
      <Text color={colors.muted} center>
        {label}
      </Text>
    </View>
  );
}
