import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/theme";

/** An action bar fixed to the bottom of a screen, above the home indicator. Give the screen `bottom={96}` so nothing hides behind it. */
export function StickyBar({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12), gap: 10 }}>
      {children}
    </View>
  );
}
