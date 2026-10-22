import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import type { CategoryId } from "@core/data";
import { coverColors, coverIconColor } from "@/theme";

const icons: Record<CategoryId, keyof typeof Ionicons.glyphMap> = {
  concert: "musical-notes",
  party: "sparkles",
  cricket: "baseball-outline",
  culture: "color-palette-outline",
  movies: "film-outline",
  food: "restaurant-outline",
  travel: "airplane-outline",
  community: "people-outline",
};

export const categoryIcon = (id: CategoryId) => icons[id];

/** The event's cover: its category gradient with the category icon. Events have no photos yet. */
export function EventCover({ category, height = 140, size, radius = 0 }: { category: CategoryId; height?: number; size?: number; radius?: number }) {
  return (
    <LinearGradient
      colors={coverColors[category]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ height: size ?? height, width: size ?? "100%", alignItems: "center", justifyContent: "center", borderRadius: radius }}
    >
      <View accessible={false}>
        <Ionicons name={icons[category]} size={(size ?? height) * 0.36} color={coverIconColor(category)} />
      </View>
    </LinearGradient>
  );
}
