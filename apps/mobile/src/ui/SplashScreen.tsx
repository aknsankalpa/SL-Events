import { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/ui/Text";
import { colors } from "@/theme";

/** How long the splash stays before it fades away. The website's splash uses about the same. */
const SHOW_MS = 2400;
const FADE_MS = 350;

/**
 * The opening screen: logo, tagline and a loading bar, drawn over the app while it finishes loading. Expo Go only
 * shows its own launch screen, so the splash is drawn here to appear in every build, Expo Go included.
 */
export function SplashScreen({ onDone }: { onDone: () => void }) {
  const progress = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: SHOW_MS - 200, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    const fade = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(({ finished }) => finished && onDone());
    }, SHOW_MS);
    return () => clearTimeout(fade);
  }, [progress, opacity, onDone]);

  return (
    <Animated.View
      accessibilityLabel="SL Events is loading"
      accessibilityRole="progressbar"
      style={[StyleSheet.absoluteFill, styles.root, { opacity }]}
      pointerEvents="auto"
    >
      <LinearGradient colors={["rgba(110,0,0,0)", "rgba(110,0,0,0.5)"]} style={styles.glow} pointerEvents="none" />
      <View style={{ alignItems: "center", gap: 18 }}>
        <Image source={require("../../assets/logo.jpg")} style={{ width: 260, height: 114 }} resizeMode="contain" accessibilityLabel="SL Events" />
        <Text variant="label" color={colors.amber} style={{ letterSpacing: 2, textTransform: "uppercase" }}>
          Discover · Book · Experience
        </Text>
        <View style={{ width: 220, marginTop: 10, gap: 10 }}>
          <View style={styles.track}>
            <Animated.View style={[styles.bar, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ["4%", "100%"] }) }]} />
          </View>
          <Text variant="small" color={colors.dim} center>
            Loading events near you
          </Text>
        </View>
      </View>
      <View style={styles.footer}>
        <Text variant="small" color={colors.muted} center>
          Sri Lankan events and entertainment in Korea
        </Text>
        <Text variant="small" color={colors.dim} center>
          Version 1.0
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: "#000", alignItems: "center", justifyContent: "center", zIndex: 100 },
  glow: { position: "absolute", left: 0, right: 0, bottom: 0, height: "50%" },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.line, overflow: "hidden" },
  bar: { height: 4, borderRadius: 2, backgroundColor: colors.gold },
  footer: { position: "absolute", bottom: 40, left: 0, right: 0, gap: 2 },
});
