import { useMemo, useState } from "react";
import { Pressable, ScrollView, View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, G, Path, Rect, Text as SvgText } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { formatKrw } from "@core/format";
import { findSeatsTogether, sectionFree, type ChartSeat, type SeatChart } from "@core/seating";
import { Text } from "@/ui/Text";
import { colors, fonts } from "@/theme";

type Props = {
  chart: SeatChart;
  /** Ids of seats someone else holds. */
  taken: ReadonlySet<string>;
  selected: readonly string[];
  /** Leave out for a chart that is only for looking at. */
  onToggle?: (id: string) => void;
  onSelectMany?: (ids: string[]) => void;
  max?: number;
};

const TAKEN = "#3a3631";
const PAD = 28;
const clampZoom = (z: number) => Math.min(4, Math.max(0.3, +z.toFixed(2)));

function RoundButton({ icon, label, onPress, disabled }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", opacity: disabled ? 0.4 : 1 }}
    >
      <Ionicons name={icon} size={18} color={colors.text} />
    </Pressable>
  );
}

/** The seat chart as buyers see it: coloured by section, taken seats greyed out, tap a seat to choose it. */
export function SeatPicker({ chart, taken, selected, onToggle, onSelectMany, max = 10 }: Props) {
  const interactive = !!onToggle;
  const pick = useMemo(() => new Set(selected), [selected]);
  const sections = useMemo(() => new Map(chart.sections.map((s) => [s.id, s])), [chart.sections]);

  // Crop to the seats and stage, so a small room fills the screen.
  const view = useMemo(() => {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const s of chart.seats) {
      xs.push(s.x - s.r, s.x + s.r);
      ys.push(s.y - s.r, s.y + s.r);
    }
    if (chart.stage) {
      xs.push(chart.stage.x, chart.stage.x + chart.stage.w);
      ys.push(chart.stage.y, chart.stage.y + chart.stage.h);
    }
    const minX = Math.max(0, Math.min(...xs, chart.width) - PAD);
    const minY = Math.max(0, Math.min(...ys, chart.height) - PAD);
    const maxX = Math.min(chart.width, Math.max(...xs, 0) + PAD);
    const maxY = Math.min(chart.height, Math.max(...ys, 0) + PAD);
    return { x: minX, y: minY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) };
  }, [chart]);

  const medianR = useMemo(() => {
    const rs = chart.seats.map((s) => s.r).sort((a, b) => a - b);
    return rs.length ? rs[rs.length >> 1]! : 10;
  }, [chart.seats]);

  const [width, setWidth] = useState(0);
  const [zoomOverride, setZoom] = useState<number | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [group, setGroup] = useState(2);
  const [note, setNote] = useState<string>();

  // Fit the room to the screen, but never so small that a seat can't be tapped: it scrolls sideways instead.
  const fitted = width > 0 ? (width - 2) / view.w : 1;
  const zoom = zoomOverride ?? clampZoom(Math.max(fitted, 24 / (2 * medianR)));
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const statusOf = (s: ChartSeat) => (s.blocked || !s.sectionId ? "blocked" : taken.has(s.id) ? "taken" : pick.has(s.id) ? "selected" : "free");
  const showNumbers = zoom * medianR >= 8;

  const rowLabels = useMemo(() => {
    const rows = new Map<string, ChartSeat>();
    for (const s of chart.seats) {
      if (!s.sectionId) continue;
      const key = `${s.sectionId}|${s.row}`;
      const cur = rows.get(key);
      if (!cur || s.x < cur.x) rows.set(key, s);
    }
    return [...rows.entries()];
  }, [chart.seats]);

  function together() {
    const ids = findSeatsTogether(chart, taken, group, focus ?? undefined);
    if (!ids) {
      setNote(`No ${group} seats are free side by side${focus ? " in this section" : ""}. Try fewer seats or another section.`);
      return;
    }
    setNote(undefined);
    onSelectMany?.(ids);
  }

  const free = chart.seats.filter((s) => !s.blocked && s.sectionId && !taken.has(s.id)).length;

  return (
    <View style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.surface, overflow: "hidden" }} onLayout={onLayout}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, gap: 8 }}>
        <Text variant="small" color={colors.muted} accessibilityLiveRegion="polite" style={{ flex: 1 }}>
          <Text variant="small" bold>
            {free}
          </Text>{" "}
          seat{free === 1 ? "" : "s"} available{interactive ? " · tap a seat" : ""}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <RoundButton icon="remove" label="Zoom out" onPress={() => setZoom(clampZoom(zoom - (zoom > 1 ? 0.25 : 0.1)))} />
          <RoundButton icon="add" label="Zoom in" onPress={() => setZoom(clampZoom(zoom + (zoom >= 1 ? 0.25 : 0.1)))} />
          <RoundButton icon="scan-outline" label="Fit the whole room" onPress={() => setZoom(clampZoom(fitted))} />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ paddingHorizontal: 1 }} style={{ backgroundColor: "rgba(0,0,0,0.4)" }} accessibilityLabel="Seat chart. Scroll sideways to look around.">
        <Svg width={view.w * zoom} height={view.h * zoom} viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}>
          {chart.stage && (
            <G>
              <Rect x={chart.stage.x} y={chart.stage.y} width={chart.stage.w} height={chart.stage.h} rx={10} fill="#f7cb60" fillOpacity={0.14} stroke="#f7cb60" strokeOpacity={0.6} strokeDasharray="6 4" />
              <SvgText fontFamily={fonts.bold} x={chart.stage.x + chart.stage.w / 2} y={chart.stage.y + chart.stage.h / 2 + 5} textAnchor="middle" fontSize={15} fontWeight="bold" fill="#f7cb60">
                {chart.stage.label.toUpperCase()}
              </SvgText>
            </G>
          )}

          {zoom * medianR >= 5 &&
            rowLabels.map(([key, s]) => (
              <SvgText fontFamily={fonts.bold} key={key} x={s.x - s.r * 2.6} y={s.y + 4} textAnchor="middle" fontSize={Math.max(9, s.r)} fontWeight="bold" fill="#f7cb60" fillOpacity={0.8}>
                {s.row}
              </SvgText>
            ))}

          {chart.seats.map((s) => {
            const status = statusOf(s);
            const sec = sections.get(s.sectionId);
            const dim = focus !== null && s.sectionId !== focus;
            const clickable = interactive && (status === "free" || status === "selected");
            const fill = status === "taken" || status === "blocked" ? TAKEN : (sec?.color ?? "#ece7dc");
            return (
              <G
                key={s.id}
                opacity={dim ? 0.25 : status === "blocked" ? 0.5 : 1}
                onPress={clickable ? () => onToggle?.(s.id) : undefined}
              >
                {/* A bigger invisible circle makes small seats easier to hit with a finger. */}
                {clickable && <Circle cx={s.x} cy={s.y} r={s.r * 1.3} fill="transparent" />}
                <Circle
                  cx={s.x}
                  cy={s.y}
                  r={s.r * 0.95}
                  fill={status === "selected" ? "#f7cb60" : fill}
                  fillOpacity={0.9}
                  stroke={status === "selected" ? "#ffffff" : status === "taken" || status === "blocked" ? "#7a756c" : "#0b0907"}
                  strokeWidth={status === "selected" ? 2.4 : 1}
                  strokeDasharray={status === "blocked" ? "3 2" : undefined}
                />
                {status === "selected" && (
                  <Path d={`M${s.x - s.r * 0.4} ${s.y} l${s.r * 0.28} ${s.r * 0.3} l${s.r * 0.55} ${-s.r * 0.6}`} fill="none" stroke="#0b0907" strokeWidth={Math.max(1.6, s.r * 0.2)} strokeLinecap="round" strokeLinejoin="round" />
                )}
                {(status === "taken" || status === "blocked") && (
                  <Path d={`M${s.x - s.r * 0.4} ${s.y - s.r * 0.4} L${s.x + s.r * 0.4} ${s.y + s.r * 0.4} M${s.x + s.r * 0.4} ${s.y - s.r * 0.4} L${s.x - s.r * 0.4} ${s.y + s.r * 0.4}`} stroke="#7a756c" strokeWidth={1.3} />
                )}
                {s.accessible && status === "free" && <Circle cx={s.x} cy={s.y} r={s.r * 0.42} fill="#0b0907" fillOpacity={0.7} />}
                {showNumbers && status === "free" && !s.accessible && (
                  <SvgText fontFamily={fonts.bold} x={s.x} y={s.y + s.r * 0.32} fontSize={Math.max(6, s.r * 0.85)} textAnchor="middle" fill="#0b0907" fontWeight="bold">
                    {String(s.num)}
                  </SvgText>
                )}
              </G>
            );
          })}
        </Svg>
      </ScrollView>

      {interactive && (
        <View style={{ padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: colors.line }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <Text variant="label">Sit together</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <RoundButton icon="remove" label="Fewer seats" disabled={group <= 1} onPress={() => setGroup((g) => g - 1)} />
              <Text bold accessibilityLiveRegion="polite" style={{ minWidth: 22, textAlign: "center" }}>
                {group}
              </Text>
              <RoundButton icon="add" label="More seats" disabled={group >= max} onPress={() => setGroup((g) => g + 1)} />
            </View>
            <Pressable accessibilityRole="button" onPress={together} style={{ height: 40, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.gold + "88", justifyContent: "center" }}>
              <Text variant="label" color={colors.gold}>
                Find {group} seat{group === 1 ? "" : "s"} together
              </Text>
            </Pressable>
          </View>
          {note && (
            <Text variant="small" color={colors.warning} accessibilityRole="alert">
              {note}
            </Text>
          )}
        </View>
      )}

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: colors.line }}>
        {chart.sections.map((sec) => {
          const on = focus === sec.id;
          return (
            <Pressable
              key={sec.id}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${sec.name}, ${formatKrw(sec.price)}, ${sectionFree(chart, sec.id, taken)} left. Tap to highlight.`}
              onPress={() => setFocus(on ? null : sec.id)}
              style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: on ? colors.gold : colors.line, backgroundColor: on ? colors.gold + "18" : "transparent" }}
            >
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: sec.color }} />
              <Text variant="small" bold>
                {sec.name}
              </Text>
              <Text variant="small" color={colors.dim}>
                {formatKrw(sec.price)} · {sectionFree(chart, sec.id, taken)} left
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16, padding: 12, paddingTop: 0 }}>
        {[
          { c: "#ece7dc", t: "Available" },
          { c: colors.gold, t: "Your seats" },
          { c: TAKEN, t: "Taken" },
        ].map((k) => (
          <View key={k.t} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: k.c, borderWidth: k.c === TAKEN ? 1 : 0, borderColor: "#7a756c" }} />
            <Text variant="caption" color={colors.dim}>
              {k.t}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
