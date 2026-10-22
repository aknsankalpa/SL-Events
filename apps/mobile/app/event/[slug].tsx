import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { categories, fromPrice, getEvent, ticketsLeft } from "@core/data";
import { formatKrw, formatPrice } from "@core/format";
import { naverMapUrl } from "@core/calendar";
import { htmlToParagraphs, openUrl, shareText } from "@/lib/rules";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { EmptyState } from "@/ui/EmptyState";
import { EventCover } from "@/ui/EventCover";
import { Screen } from "@/ui/Screen";
import { StickyBar } from "@/ui/StickyBar";
import { Text } from "@/ui/Text";
import { colors } from "@/theme";

function Info({ icon, title, sub, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; sub?: string; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole={onPress ? "link" : "text"} disabled={!onPress} onPress={onPress} style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.gold + "22", alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={18} color={colors.gold} />
      </View>
      <View style={{ flex: 1 }}>
        <Text bold>{title}</Text>
        {sub && (
          <Text variant="small" color={onPress ? colors.gold : colors.muted}>
            {sub}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export default function EventDetails() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const event = getEvent(slug);

  if (!event) {
    return (
      <Screen>
        <EmptyState icon="calendar-outline" title="We could not find that event" body="It may have ended or the link is wrong." action="Browse events" onAction={() => router.replace("/events")} />
      </Screen>
    );
  }

  const paragraphs = event.descriptionHtml ? htmlToParagraphs(event.descriptionHtml) : event.description;
  const soldOut = event.ticketTypes.every((t) => ticketsLeft(t) === 0);
  const price = event.singlePrice ? formatPrice(fromPrice(event)) : `From ${formatPrice(fromPrice(event))}`;
  const label = categories.find((c) => c.id === event.category)?.label ?? "";

  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      <Stack.Screen options={{ title: event.title.length > 24 ? "Event" : event.title }} />
      <Screen padded={false} bottom={96} style={{ gap: 20 }}>
        <EventCover category={event.category} height={190} />
        <View style={{ paddingHorizontal: 20, gap: 20 }}>
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Badge label={label} tone="warning" />
              {event.fewLeft && <Badge label="Few left" tone="danger" />}
              {event.sellingFast && <Badge label="Selling fast" tone="success" />}
            </View>
            <Text variant="title">{event.title}</Text>
            <Text color={colors.muted}>{event.tagline}</Text>
          </View>

          <View style={{ gap: 14 }}>
            <Info icon="calendar-outline" title={event.longDate} sub={`${event.time} · doors open ${event.doorsOpen}`} />
            <Info icon="location-outline" title={event.venue} sub={`${event.area} · Open in map`} onPress={() => openUrl(naverMapUrl(`${event.venue} ${event.area}`))} />
            <Info icon="person-outline" title={event.organizer} sub="Organizer" />
          </View>

          <View style={{ gap: 10 }}>
            <Text variant="heading">About this event</Text>
            {paragraphs.map((p, i) => (
              <Text key={i} color={colors.muted}>
                {p}
              </Text>
            ))}
          </View>

          <View style={{ gap: 10 }}>
            <Text variant="heading">Tickets</Text>
            {event.ticketTypes.map((t) => {
              const left = ticketsLeft(t);
              return (
                <Card key={t.id} style={{ gap: 6, opacity: left === 0 ? 0.6 : 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text variant="heading">{t.name}</Text>
                    <Text variant="heading" color={colors.gold}>
                      {t.price === 0 ? "Free" : formatKrw(t.price)}
                    </Text>
                  </View>
                  {t.perks.map((p) => (
                    <View key={p} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                      <Ionicons name="checkmark" size={14} color={colors.success} />
                      <Text variant="small" color={colors.muted}>
                        {p}
                      </Text>
                    </View>
                  ))}
                  <Text variant="caption" color={left === 0 ? colors.danger : left <= 10 ? colors.warning : colors.dim}>
                    {left === 0 ? "Sold out" : left <= 10 ? `Only ${left} left` : `${left} tickets left`}
                  </Text>
                </Card>
              );
            })}
          </View>

          <Button title="Share this event" variant="ghost" small icon={<Ionicons name="share-outline" size={16} color={colors.muted} />} onPress={() => shareText(`${event.title} · ${event.dateLabel} · ${event.venue}, ${event.city}`)} />
        </View>
      </Screen>
      <StickyBar>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <View>
            <Text variant="caption" color={colors.dim}>
              {event.singlePrice ? "Price" : "Tickets from"}
            </Text>
            <Text variant="heading">{price.replace("From ", "")}</Text>
          </View>
          <Button title={soldOut ? "Sold out" : "Book tickets"} disabled={soldOut} onPress={() => router.push(`/book/${event.slug}` as never)} style={{ flex: 1 }} />
        </View>
      </StickyBar>
    </View>
  );
}
