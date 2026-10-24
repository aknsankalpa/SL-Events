import { useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius } from "@/theme";
import { Text } from "@/ui/Text";
import type { Outcome } from "./data";

/* ------------------------------ connection pill ------------------------------ */

export function OnlinePill({ online }: { online: boolean }) {
  return online ? (
    <View style={[styles.pill, { backgroundColor: "#0f2a20", borderColor: colors.success + "55" }]} accessibilityLabel="Online">
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success }} />
      <Text variant="caption" bold color={colors.success}>
        Online
      </Text>
    </View>
  ) : (
    <View style={[styles.pill, { backgroundColor: "#2a0f0f", borderColor: "#ff6b6b66" }]} accessibilityLabel="Offline">
      <Ionicons name="cloud-offline-outline" size={12} color="#ff6b6b" />
      <Text variant="caption" bold color="#ff6b6b">
        Offline
      </Text>
    </View>
  );
}

/* --------------------------------- screen header --------------------------------- */

type HeaderProps = { title: string; subtitle?: string; online: boolean; left?: "back" | "close" | null; onBack?: () => void };

/** Top bar of the staff screens: back or close, the event and door, and the connection state. */
export function StaffHeader({ title, subtitle, online, left = "back", onBack }: HeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.page }}>
      {left && (
        <Pressable accessibilityRole="button" accessibilityLabel={left === "close" ? "Close" : "Back"} onPress={() => (onBack ? onBack() : router.canGoBack() ? router.back() : router.replace("/staff"))} hitSlop={12}>
          <Ionicons name={left === "close" ? "close" : "chevron-back"} size={24} color={colors.text} />
        </Pressable>
      )}
      <View style={{ flex: 1 }}>
        <Text variant="heading" numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text variant="small" color={colors.muted} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      <OnlinePill online={online} />
    </View>
  );
}

/* ------------------------------------ tab bar ------------------------------------ */

const tabIcons: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  index: { label: "Events", icon: "calendar-outline" },
  summary: { label: "Summary", icon: "stats-chart-outline" },
};

/** The parts of the navigator's tab-bar props this bar uses. */
type BottomTabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigateToTab: (routeKey: string) => void;
};

/** Events and Summary either side of a raised gold Scan button. */
export function StaffTabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const go = (key: string, focused: boolean) => {
    if (!focused) navigateToTab(key);
  };
  const order = ["index", "scan", "summary"];
  const routes = order.map((n) => state.routes.find((r) => r.name === n)).filter(Boolean) as typeof state.routes;

  return (
    <View style={{ backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line, paddingBottom: Math.max(insets.bottom, 8), paddingTop: 8, flexDirection: "row", alignItems: "flex-end" }}>
      {routes.map((route) => {
        const focused = state.routes[state.index]?.key === route.key;
        if (route.name === "scan") {
          return (
            <Pressable key={route.key} accessibilityRole="button" accessibilityLabel="Scan" accessibilityState={{ selected: focused }} onPress={() => go(route.key, focused)} style={{ flex: 1, alignItems: "center", marginTop: -34 }}>
              <LinearGradient colors={[colors.gold, colors.amber]} style={{ width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: colors.surface }}>
                <Ionicons name="scan-outline" size={28} color={colors.ink} />
              </LinearGradient>
              <Text variant="caption" bold color={focused ? colors.gold : colors.muted} style={{ marginTop: 4 }}>
                Scan
              </Text>
            </Pressable>
          );
        }
        const meta = tabIcons[route.name]!;
        return (
          <Pressable key={route.key} accessibilityRole="button" accessibilityLabel={meta.label} accessibilityState={{ selected: focused }} onPress={() => go(route.key, focused)} style={{ flex: 1, alignItems: "center", gap: 4, paddingBottom: 2 }}>
            <Ionicons name={meta.icon} size={22} color={focused ? colors.gold : colors.muted} />
            <Text variant="caption" bold={focused} color={focused ? colors.gold : colors.muted}>
              {meta.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* -------------------------------------- bits -------------------------------------- */

export function StatTile({ label, children, flex = 1 }: { label: string; children: React.ReactNode; flex?: number }) {
  return (
    <View style={{ flex, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: 14, gap: 6, minHeight: 84 }}>
      <Text variant="small" color={colors.muted}>
        {label}
      </Text>
      {children}
    </View>
  );
}

export function ProgressBar({ value, max, height = 8, track = colors.line }: { value: number; max: number; height?: number; track?: string }) {
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: track, overflow: "hidden" }}>
      <LinearGradient colors={[colors.gold, colors.amber]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: "100%", width: `${max ? Math.min(100, (value / max) * 100) : 0}%`, borderRadius: height / 2 }} />
    </View>
  );
}

/** A bottom sheet with a list of choices. */
export function PickerSheet({ open, title, options, value, onPick, onClose }: { open: boolean; title: string; options: string[]; value: string; onPick: (v: string) => void; onClose: () => void }) {
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)" }} onPress={onClose} accessibilityLabel="Close" />
      <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.line, maxHeight: "60%" }}>
        <Text variant="heading" style={{ marginBottom: 8 }}>
          {title}
        </Text>
        <FlatList
          data={options}
          keyExtractor={(o) => o}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: item === value }}
              onPress={() => {
                onPick(item);
                onClose();
              }}
              style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line }}
            >
              <Text color={item === value ? colors.gold : colors.text} bold={item === value}>
                {item}
              </Text>
              {item === value && <Ionicons name="checkmark" size={18} color={colors.gold} />}
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

/** Small state hook for sheets. */
export function useToggle(initial = false): [boolean, () => void, () => void] {
  const [on, setOn] = useState(initial);
  return [on, () => setOn(true), () => setOn(false)];
}

/* ------------------------------- result styling ------------------------------- */

export type Tone = { border: string; bg: string; circle: string; title: string; verdictBg: string; verdictBorder: string };

const green: Tone = { border: colors.success, bg: "#0f2a20", circle: colors.success, title: colors.success, verdictBg: "#0f2a20", verdictBorder: colors.success + "66" };
const red: Tone = { border: "#ff6b6b", bg: "#2a0f0f", circle: "#ff6b6b", title: "#ff6b6b", verdictBg: "#2a0f0f", verdictBorder: "#ff6b6b66" };
const gold: Tone = { border: colors.gold, bg: "#2a200a", circle: colors.gold, title: colors.gold, verdictBg: "#2a200a", verdictBorder: colors.gold + "66" };
const stone: Tone = { border: "#bfb5a4", bg: "#1b1816", circle: "#b9ae9a", title: "#b9ae9a", verdictBg: "#1b1816", verdictBorder: "#bfb5a455" };

type Look = { tone: Tone; icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string };

export const outcomeLook: Record<Outcome, Look> = {
  admit: { tone: green, icon: "check", title: "Admit" },
  already_used: { tone: red, icon: "history", title: "Already used" },
  invalid: { tone: red, icon: "shield-off-outline", title: "Invalid ticket" },
  wrong_entrance: { tone: gold, icon: "lock-outline", title: "Wrong entrance" },
  wrong_event: { tone: gold, icon: "calendar-remove-outline", title: "Wrong event" },
  not_paid: { tone: gold, icon: "timer-sand", title: "Not paid yet" },
  cancelled: { tone: stone, icon: "cancel", title: "Cancelled" },
};

export const pillTone: Record<Outcome, { bg: string; fg: string }> = {
  admit: { bg: "#0f2a20", fg: colors.success },
  already_used: { bg: "#2a0f0f", fg: "#ff6b6b" },
  invalid: { bg: "#2a0f0f", fg: "#ff6b6b" },
  wrong_entrance: { bg: "#2a200a", fg: colors.gold },
  wrong_event: { bg: "#2a200a", fg: colors.gold },
  not_paid: { bg: "#2a200a", fg: colors.gold },
  cancelled: { bg: "#1b1816", fg: "#b9ae9a" },
};

const styles = StyleSheet.create({
  pill: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
});
