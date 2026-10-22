import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { categories, fromPrice, type EventItem } from "@core/data";
import { formatPrice } from "@core/format";
import { colors, radius } from "@/theme";
import { Badge } from "./Badge";
import { EventCover } from "./EventCover";
import { Text } from "./Text";

/** An event in a list: cover, date, title, place and the lowest price. Opens the event. */
export function EventCard({ event, compact }: { event: EventItem; compact?: boolean }) {
  const price = event.singlePrice ? formatPrice(fromPrice(event)) : `From ${formatPrice(fromPrice(event))}`;
  const label = categories.find((c) => c.id === event.category)?.label ?? "";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${event.dateLabel}, ${event.venue}, ${price}`}
      onPress={() => router.push(`/event/${event.slug}` as never)}
      style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1, width: compact ? 260 : undefined })}
    >
      <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, overflow: "hidden" }}>
        <EventCover category={event.category} height={compact ? 110 : 132} />
        <View style={{ padding: 14, gap: 6 }}>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <Badge label={label} tone="warning" />
            {event.fewLeft && <Badge label="Few left" tone="danger" />}
            {event.sellingFast && !event.fewLeft && <Badge label="Selling fast" tone="success" />}
          </View>
          <Text variant="small" color={colors.gold} bold>
            {event.dateLabel}
          </Text>
          <Text variant="heading" numberOfLines={2}>
            {event.title}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="location-outline" size={14} color={colors.dim} />
            <Text variant="small" color={colors.muted} numberOfLines={1} style={{ flex: 1 }}>
              {event.venue}, {event.city}
            </Text>
          </View>
          <Text bold style={{ marginTop: 2 }}>
            {price}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
