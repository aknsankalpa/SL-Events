import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, fonts, radius } from "@/theme";
import { Text } from "./Text";

type Variant = "primary" | "outline" | "ghost" | "danger";

type Props = Omit<PressableProps, "children" | "style"> & {
  title: string;
  variant?: Variant;
  loading?: boolean;
  small?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, variant = "primary", loading, small, icon, disabled, style, ...rest }: Props) {
  const off = disabled || loading;
  const height = small ? 40 : 52;
  const fg = variant === "primary" ? colors.ink : variant === "danger" ? "#fff" : variant === "outline" ? colors.gold : colors.muted;

  const label = (
    <View style={styles.row}>
      {loading ? <ActivityIndicator color={fg} /> : icon}
      <Text style={{ fontFamily: fonts.bold, fontSize: small ? 13 : 15, color: fg }}>{title}</Text>
    </View>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      style={({ pressed }) => [{ opacity: off ? 0.5 : pressed ? 0.85 : 1 }, style]}
      {...rest}
    >
      {variant === "primary" ? (
        <LinearGradient colors={[colors.gold, colors.amber]} style={[styles.base, { height }]}>
          {label}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.base,
            { height },
            variant === "outline" && { borderWidth: 1, borderColor: "rgba(247,203,96,0.6)" },
            variant === "danger" && { backgroundColor: colors.danger },
          ]}
        >
          {label}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.md, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
});
