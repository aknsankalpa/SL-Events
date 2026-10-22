import { useCallback, useMemo, useRef, useState } from "react";
import { Linking, Platform, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { ticketsFor } from "@core/bookings";
import { bookingStore } from "@core/bookingStore";
import { attendees } from "@core/organizer";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Field } from "@/ui/Field";
import { Screen } from "@/ui/Screen";
import { Text } from "@/ui/Text";
import { colors, radius } from "@/theme";

type Outcome = "admit" | "already_used" | "not_found";
type Result = { outcome: Outcome; title: string; name?: string; detail?: string; note: string };
type Scan = { outcome: Outcome; name: string; time: string };

const look: Record<Outcome, { color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  admit: { color: colors.success, icon: "checkmark-circle" },
  already_used: { color: colors.danger, icon: "close-circle" },
  not_found: { color: colors.danger, icon: "alert-circle" },
};

/**
 * Door scanner for organizers and staff. It checks a ticket code against the tickets the rules allow to exist, and a
 * code can be admitted once. The check is local for now: the real one must happen on the server, which marks the
 * ticket used in the same step that answers "admit", and only for a signed-in organizer or door staff account.
 */
export default function Scanner() {
  const [permission, requestPermission] = useCameraPermissions();
  const [result, setResult] = useState<Result>();
  const [scans, setScans] = useState<Scan[]>([]);
  const [manual, setManual] = useState("");
  const used = useRef(new Set<string>());
  const last = useRef({ value: "", at: 0 });

  const holders = useMemo(() => {
    const fromAttendees = attendees.filter((a) => a.state !== "cancelled").map((a) => ({ code: a.code, name: a.name, ticket: a.ticket, booking: a.booking, scanned: a.state === "checked_in" }));
    const fromBookings = bookingStore.getSnapshot().flatMap((b) => ticketsFor(b).map((t) => ({ code: t.code, name: t.holder, ticket: t.ticketName, booking: b.id, scanned: t.scanned })));
    return new Map([...fromAttendees, ...fromBookings].map((h) => [h.code, h]));
  }, []);

  const check = useCallback(
    (raw: string) => {
      const value = raw.trim().toUpperCase();
      if (!value) return;
      const holder = holders.get(value);
      let next: Result;
      if (!holder) next = { outcome: "not_found", title: "Not valid", note: "No ticket with that code." };
      else if (holder.scanned || used.current.has(value)) next = { outcome: "already_used", title: "Already used", name: holder.name, detail: `${holder.ticket} · ${holder.code}`, note: "This ticket has already been scanned." };
      else {
        used.current.add(value);
        next = { outcome: "admit", title: "Admit", name: holder.name, detail: `${holder.ticket} · ${holder.code}`, note: `Booking ${holder.booking} checked in.` };
      }
      setResult(next);
      setScans((s) => [{ outcome: next.outcome, name: next.name ?? "Unknown", time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) }, ...s].slice(0, 6));
      if (Platform.OS !== "web") void Haptics.notificationAsync(next.outcome === "admit" ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error).catch(() => undefined);
    },
    [holders],
  );

  const onScan = useCallback(
    ({ data }: { data: string }) => {
      const now = Date.now();
      // The camera reads the same code many times a second: ignore repeats for a few seconds.
      if (data === last.current.value && now - last.current.at < 3000) return;
      last.current = { value: data, at: now };
      check(data);
    },
    [check],
  );

  const counts = {
    admitted: scans.filter((s) => s.outcome === "admit").length,
    refused: scans.filter((s) => s.outcome !== "admit").length,
  };

  return (
    <Screen>
      <View style={{ height: 280, borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" }}>
        {permission?.granted ? (
          <>
            <CameraView style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={onScan} accessibilityLabel="Camera for scanning ticket QR codes" />
            <View pointerEvents="none" style={{ width: 190, height: 190, borderRadius: 20, borderWidth: 3, borderColor: colors.gold }} />
          </>
        ) : permission && !permission.canAskAgain ? (
          <View style={{ padding: 24, gap: 12, alignItems: "center" }}>
            <Ionicons name="camera-outline" size={32} color={colors.dim} />
            <Text center color={colors.muted}>
              Camera access is turned off. Allow it in Settings, or type the ticket code below.
            </Text>
            <Button title="Open Settings" small variant="outline" onPress={() => Linking.openSettings().catch(() => undefined)} />
          </View>
        ) : (
          <View style={{ padding: 24, gap: 12, alignItems: "center" }}>
            <Ionicons name="scan-outline" size={32} color={colors.gold} />
            <Text center color={colors.muted}>
              Allow the camera to scan ticket QR codes.
            </Text>
            <Button title="Allow camera" small onPress={() => void requestPermission()} />
          </View>
        )}
      </View>

      <View accessibilityLiveRegion="polite" style={{ borderRadius: radius.lg, borderWidth: 1, padding: 18, gap: 4, borderColor: result ? look[result.outcome].color + "99" : colors.line, backgroundColor: result ? look[result.outcome].color + "1a" : colors.surface }}>
        {result ? (
          <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
            <Ionicons name={look[result.outcome].icon} size={40} color={look[result.outcome].color} />
            <View style={{ flex: 1 }}>
              <Text variant="title" color={look[result.outcome].color}>
                {result.title}
              </Text>
              {result.name && <Text bold>{result.name}</Text>}
              {result.detail && (
                <Text variant="small" color={colors.muted}>
                  {result.detail}
                </Text>
              )}
              <Text variant="small" color={colors.muted}>
                {result.note}
              </Text>
            </View>
          </View>
        ) : (
          <Text color={colors.muted}>Scan a ticket to see the result here.</Text>
        )}
      </View>

      <Card style={{ gap: 12 }}>
        <Field label="Or type a ticket code" value={manual} onChangeText={setManual} autoCapitalize="characters" placeholder="SLE-7K3F-92QD" onSubmitEditing={() => { check(manual); setManual(""); }} />
        <Button title="Check code" small variant="outline" onPress={() => { check(manual); setManual(""); }} />
      </Card>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <Card style={{ flex: 1 }}>
          <Text variant="title" color={colors.success}>
            {counts.admitted}
          </Text>
          <Text variant="small" color={colors.muted}>
            Admitted
          </Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text variant="title" color={colors.danger}>
            {counts.refused}
          </Text>
          <Text variant="small" color={colors.muted}>
            Refused
          </Text>
        </Card>
      </View>

      {scans.length > 0 && (
        <Card style={{ gap: 4 }}>
          <Text variant="heading" style={{ marginBottom: 4 }}>
            Recent scans
          </Text>
          {scans.map((s, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 }}>
              <Ionicons name={look[s.outcome].icon} size={16} color={look[s.outcome].color} />
              <Text variant="small" style={{ flex: 1 }}>
                {s.name}
              </Text>
              <Text variant="caption" color={colors.dim}>
                {s.time}
              </Text>
            </View>
          ))}
        </Card>
      )}
      <Text variant="small" color={colors.dim} center>
        Demo data: codes come from the sample bookings and attendee list.
      </Text>
    </Screen>
  );
}
