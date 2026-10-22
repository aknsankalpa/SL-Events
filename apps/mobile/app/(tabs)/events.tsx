import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { categories, cities, events, type CategoryId } from "@core/data";
import { EmptyState } from "@/ui/EmptyState";
import { EventCard } from "@/ui/EventCard";
import { Select } from "@/ui/Select";
import { Text } from "@/ui/Text";
import { colors, fonts, radius } from "@/theme";

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={{ paddingHorizontal: 16, height: 36, borderRadius: radius.pill, borderWidth: 1, alignItems: "center", justifyContent: "center", borderColor: active ? colors.gold : colors.line, backgroundColor: active ? colors.gold + "22" : colors.surface }}
    >
      <Text variant="label" color={active ? colors.gold : colors.muted}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function Events() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ category?: string }>();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryId | "">((categories.find((c) => c.id === params.category)?.id as CategoryId) ?? "");
  const [city, setCity] = useState("All cities");

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...events]
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
      .filter((e) => (!category || e.category === category) && (city === "All cities" || e.city === city) && (!q || `${e.title} ${e.venue} ${e.city} ${e.tagline}`.toLowerCase().includes(q)));
  }, [query, category, city]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.page, paddingTop: insets.top + 12 }}>
      <View style={{ paddingHorizontal: 20, gap: 14 }}>
        <Text variant="display">Events</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, height: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: 16 }}>
          <Ionicons name="search" size={18} color={colors.dim} />
          <TextInput
            accessibilityLabel="Search events"
            value={query}
            onChangeText={setQuery}
            placeholder="Search events, venues, cities"
            placeholderTextColor={colors.dim}
            selectionColor={colors.gold}
            returnKeyType="search"
            style={{ flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 15, height: "100%" }}
          />
          {query.length > 0 && (
            <Pressable accessibilityLabel="Clear search" onPress={() => setQuery("")} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={colors.dim} />
            </Pressable>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Chip label="All" active={category === ""} onPress={() => setCategory("")} />
          {categories.map((c) => (
            <Chip key={c.id} label={c.label} active={category === c.id} onPress={() => setCategory(category === c.id ? "" : c.id)} />
          ))}
        </ScrollView>
        <Select label="City" value={city} options={["All cities", ...cities]} onChange={setCity} />
        <Text variant="small" color={colors.muted} accessibilityLiveRegion="polite">
          {list.length} {list.length === 1 ? "event" : "events"}
        </Text>
      </View>
      <FlatList
        data={list}
        keyExtractor={(e) => e.slug}
        renderItem={({ item }) => <EventCard event={item} />}
        contentContainerStyle={{ padding: 20, gap: 16 }}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<EmptyState icon="search" title="No events found" body="Try a different search, category or city." action="Clear filters" onAction={() => { setQuery(""); setCategory(""); setCity("All cities"); }} />}
      />
    </View>
  );
}
