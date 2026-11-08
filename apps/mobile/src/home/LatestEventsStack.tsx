import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, PanResponder, Platform, Pressable, View, type LayoutChangeEvent } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { fromPrice, type EventItem } from "@core/data";
import { formatPrice } from "@core/format";
import { EventCover } from "@/ui/EventCover";
import { Text } from "@/ui/Text";
import { colors, radius } from "@/theme";

const AUTO_MS = 5000;
const SWIPE = 70;
const CARD_H = 350;
const PEEK = 50;
/** The native animation driver doesn't exist in the browser preview. */
const NATIVE_DRIVER = Platform.OS !== "web";

/**
 * Where a card sits, from its distance to the front: 0 is the front card, 1 and 2 peek out behind it, -1 is the card that
 * just left (off to the left) and 3 is waiting hidden at the back. The same layout as the website's stack.
 */
function slotOf(pos: number, count: number) {
  if (pos === 0) return 0;
  if (pos === 1) return 1;
  if (pos === 2) return 2;
  if (pos === count - 1) return -1;
  return 3;
}

/**
 * The latest events as a stack of cards, like the website's home page. Swipe the front card left for the next event or
 * right for the previous one; tap it to open the event. It moves on by itself every few seconds, except while it is
 * being touched or when the phone asks for less motion.
 */
export function LatestEventsStack({ events }: { events: EventItem[] }) {
  const count = events.length;
  const [active, setActive] = useState(0);
  const [width, setWidth] = useState(0);
  const [hold, setHold] = useState(false);
  const [still, setStill] = useState(false);
  const slots = useRef(events.map((_, i) => new Animated.Value(slotOf(i, count)))).current;
  const last = useRef(events.map((_, i) => slotOf(i, count)));
  const drag = useRef(new Animated.Value(0)).current;
  const busy = useRef(false);
  // The handlers below are made once, so they read the newest values from here.
  const live = useRef({ active, width, count });
  live.current = { active, width, count };

  const go = (to: number) => setActive(((to % count) + count) % count);

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((on) => alive && setStill(on));
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setStill);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  // Move every card to its new place. Cards that jump between the far left and the hidden back are set straight there,
  // so they never sweep across the stack on the way.
  useEffect(() => {
    events.forEach((_, i) => {
      const to = slotOf((i - active + count) % count, count);
      const from = last.current[i]!;
      last.current[i] = to;
      if (to === from) return;
      if (Math.abs(to - from) > 1 || still) slots[i]!.setValue(to);
      else Animated.timing(slots[i]!, { toValue: to, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: NATIVE_DRIVER }).start();
    });
  }, [active, count, events, slots, still]);

  useEffect(() => {
    if (hold || still || count < 2) return;
    const id = setTimeout(() => setActive((a) => (a + 1) % count), AUTO_MS);
    return () => clearTimeout(id);
  }, [active, hold, still, count]);

  const pan = useRef(
    PanResponder.create({
      // Only a sideways drag belongs to the stack; an up-and-down drag still scrolls the page.
      onMoveShouldSetPanResponder: (_, g) => !busy.current && Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => setHold(true),
      onPanResponderMove: Animated.event([null, { dx: drag }], { useNativeDriver: false }),
      onPanResponderRelease: (_, g) => {
        setHold(false);
        const { active: a, width: w, count: n } = live.current;
        if (g.dx <= -SWIPE && n > 1) {
          // Throw the card off to the left, then bring the next one forward.
          busy.current = true;
          Animated.timing(drag, { toValue: -w * 1.3, duration: 180, useNativeDriver: NATIVE_DRIVER }).start(() => {
            slots[a]!.setValue(-1);
            last.current[a] = -1;
            drag.setValue(0);
            setActive((a + 1) % n);
            busy.current = false;
          });
        } else if (g.dx >= SWIPE && n > 1) {
          drag.setValue(0);
          setActive((a - 1 + n) % n);
        } else {
          Animated.spring(drag, { toValue: 0, useNativeDriver: NATIVE_DRIVER, friction: 6 }).start();
        }
      },
      onPanResponderTerminate: () => {
        setHold(false);
        Animated.spring(drag, { toValue: 0, useNativeDriver: NATIVE_DRIVER }).start();
      },
    }),
  ).current;

  if (count === 0) return null;
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View
      onLayout={onLayout}
      accessibilityRole="adjustable"
      accessibilityLabel={`Latest events, ${active + 1} of ${count}: ${events[active]!.title}`}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) => (e.nativeEvent.actionName === "increment" ? go(active + 1) : go(active - 1))}
      style={{ height: CARD_H + PEEK, paddingTop: PEEK }}
    >
      {width > 0 &&
        events.map((event, i) => {
          const pos = (i - active + count) % count;
          const front = pos === 0;
          const s = slots[i]!;
          const range = [-1, 0, 1, 2, 3];
          const transform = [
            { translateX: s.interpolate({ inputRange: range, outputRange: [-width * 1.15, 0, 0, 0, 0] }) },
            { translateY: s.interpolate({ inputRange: range, outputRange: [0, 0, -24, -46, -46] }) },
            { scale: s.interpolate({ inputRange: range, outputRange: [0.96, 1, 0.94, 0.88, 0.88] }) },
            { rotate: s.interpolate({ inputRange: range, outputRange: ["-9deg", "0deg", "0deg", "0deg", "0deg"] }) },
            ...(front
              ? [{ translateX: drag }, { rotate: drag.interpolate({ inputRange: [-300, 0, 300], outputRange: ["-12deg", "0deg", "12deg"] }) }]
              : []),
          ];
          return (
            <Animated.View
              key={event.slug}
              {...(front ? pan.panHandlers : {})}
              pointerEvents={front ? "auto" : "none"}
              importantForAccessibility={front ? "auto" : "no-hide-descendants"}
              accessibilityElementsHidden={!front}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: PEEK,
                height: CARD_H,
                zIndex: front ? 30 : pos === count - 1 ? 40 : 30 - pos * 10,
                opacity: s.interpolate({ inputRange: range, outputRange: [0, 1, 0.85, 0.55, 0] }),
                transform,
              }}
            >
              <StackCard event={event} />
            </Animated.View>
          );
        })}
    </View>
  );
}

function StackCard({ event }: { event: EventItem }) {
  const free = fromPrice(event) === 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${event.dateLabel}, ${event.venue}. Opens the event.`}
      onPress={() => router.push(`/event/${event.slug}` as never)}
      style={({ pressed }) => ({
        flex: 1,
        opacity: pressed ? 0.92 : 1,
        borderRadius: radius.lg + 4,
        borderWidth: 1,
        borderColor: colors.gold + "55",
        backgroundColor: colors.surface,
        overflow: "hidden",
      })}
    >
      <View style={{ flex: 1 }}>
        <EventCover category={event.category} height={190} />
        <View style={{ position: "absolute", left: 14, top: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.gold + "66", backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text variant="caption" color={colors.gold} bold style={{ textTransform: "uppercase" }}>
            {event.category}
          </Text>
        </View>
        <View style={{ position: "absolute", left: 14, top: 150, borderRadius: 8, backgroundColor: "rgba(0,0,0,0.65)", paddingHorizontal: 10, paddingVertical: 5 }}>
          <Text variant="caption" color={colors.amber} bold>
            {event.badgeDate}
          </Text>
        </View>
      </View>
      <View style={{ padding: 16, gap: 6 }}>
        <Text variant="heading" numberOfLines={1} style={{ fontSize: 18 }}>
          {event.title}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="location-outline" size={14} color={colors.dim} />
          <Text variant="small" color={colors.muted} numberOfLines={1} style={{ flex: 1 }}>
            {event.venue}, {event.city}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line }}>
          <Text bold>{event.singlePrice || free ? formatPrice(fromPrice(event)) : `From ${formatPrice(fromPrice(event))}`}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text variant="label" color={colors.amber}>
              View event
            </Text>
            <Ionicons name="arrow-forward" size={14} color={colors.amber} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}
