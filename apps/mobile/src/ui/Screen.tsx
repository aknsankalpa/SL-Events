import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/theme";

type Props = {
  children: React.ReactNode;
  /** A plain View instead of a ScrollView, for screens that manage their own scrolling (lists). */
  fixed?: boolean;
  /** Extra space at the bottom, e.g. for a sticky action bar. */
  bottom?: number;
  /** Tab screens have no top bar of their own, so they pad for the status bar. */
  topInset?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Screen({ children, fixed, bottom = 0, topInset, padded = true, style }: Props) {
  const insets = useSafeAreaInsets();
  const pad = { paddingTop: topInset ? insets.top + 12 : 12, paddingHorizontal: padded ? 20 : 0, paddingBottom: 24 + bottom };
  if (fixed) return <View style={[styles.root, pad, style]}>{children}</View>;
  return (
    <ScrollView style={styles.root} contentContainerStyle={[pad, { gap: 16 }, style]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.page } });
