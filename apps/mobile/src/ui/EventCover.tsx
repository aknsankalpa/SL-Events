import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, View, type ImageSourcePropType } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { CategoryId } from "@core/data";
import { coverColors } from "@/theme";

const art: Record<CategoryId, ImageSourcePropType> = {
  concert: require("../../assets/categories/concert.png"),
  party: require("../../assets/categories/party.png"),
  cricket: require("../../assets/categories/cricket.png"),
  culture: require("../../assets/categories/culture.png"),
  movies: require("../../assets/categories/movies.png"),
  food: require("../../assets/categories/food.png"),
  travel: require("../../assets/categories/travel.png"),
  community: require("../../assets/categories/community.png"),
};

/** The small movement each picture makes, the same idea as the website's .cat-* animations. */
const motion: Record<CategoryId, { rotate?: number; scale?: number; lift?: number; ms: number }> = {
  concert: { rotate: 7, ms: 1300 },
  party: { scale: 1.1, ms: 700 },
  cricket: { lift: 0.09, ms: 1100 },
  culture: { rotate: 7, ms: 1600 },
  movies: { rotate: 6, ms: 1400 },
  food: { rotate: 8, ms: 1500 },
  travel: { rotate: 12, ms: 2500 },
  community: { scale: 1.07, ms: 1700 },
};

/** The category picture on a light disc that floats gently. Holds still when the phone asks for less motion. */
function CategoryArt({ category, size }: { category: CategoryId; size: number }) {
  const float = useRef(new Animated.Value(0)).current;
  const move = useRef(new Animated.Value(0)).current;
  const [still, setStill] = useState(false);

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((on) => alive && setStill(on));
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setStill);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (still) return;
    const swing = (value: Animated.Value, ms: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      );
    const a = swing(float, 2100);
    const b = swing(move, motion[category].ms);
    a.start();
    b.start();
    return () => {
      a.stop();
      b.stop();
    };
  }, [still, category, float, move]);

  const m = motion[category];
  const inner = size * 0.72;
  const transform = [
    ...(m.rotate ? [{ rotate: move.interpolate({ inputRange: [0, 1], outputRange: [`${-m.rotate}deg`, `${m.rotate}deg`] }) }] : []),
    ...(m.scale ? [{ scale: move.interpolate({ inputRange: [0, 1], outputRange: [0.96, m.scale] }) }] : []),
    ...(m.lift ? [{ translateY: move.interpolate({ inputRange: [0, 1], outputRange: [0, -inner * m.lift] }) }] : []),
  ];

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#fff8ec",
        alignItems: "center",
        justifyContent: "center",
        transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [size * 0.03, -size * 0.05] }) }],
      }}
    >
      <Animated.Image source={art[category]} style={{ width: inner, height: inner, transform }} resizeMode="contain" />
    </Animated.View>
  );
}

/** The event's cover: its category gradient with the category picture. Events have no photos yet. */
export function EventCover({ category, height = 140, size, radius = 0 }: { category: CategoryId; height?: number; size?: number; radius?: number }) {
  return (
    <LinearGradient
      colors={coverColors[category]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ height: size ?? height, width: size ?? "100%", alignItems: "center", justifyContent: "center", borderRadius: radius }}
    >
      <View accessible={false}>
        <CategoryArt category={category} size={(size ?? height) * 0.62} />
      </View>
    </LinearGradient>
  );
}
