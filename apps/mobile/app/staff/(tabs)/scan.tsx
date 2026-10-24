import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, Modal, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useSession } from "@/lib/hooks";
import { staffFor } from "@/lib/roles";
import { demoCodes, staffEvent } from "@/staff/data";
import { useConnection } from "@/staff/hooks";
import { checkTicket, scanRequests, selectGate, setOffline, useStaffState } from "@/staff/store";
import { useSummary } from "@/staff/summary";
import { PickerSheet, StaffHeader, StatTile } from "@/staff/ui";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { Text } from "@/ui/Text";
import { colors, radius } from "@/theme";

/** How long the phone shows "Checking ticket…". The real check is one round trip to the SL Events server. */
const CHECK_MS = 700;
const RETRY_SECONDS = 5;

function Corner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const top = pos[0] === "t";
  const left = pos[1] === "l";
  return (
    <View
      style={{
        position: "absolute",
        [top ? "top" : "bottom"]: 0,
        [left ? "left" : "right"]: 0,
        width: 54,
        height: 54,
        borderColor: colors.gold,
        borderTopWidth: top ? 5 : 0,
        borderBottomWidth: top ? 0 : 5,
        borderLeftWidth: left ? 5 : 0,
        borderRightWidth: left ? 0 : 5,
        borderTopLeftRadius: top && left ? 18 : 0,
        borderTopRightRadius: top && !left ? 18 : 0,
        borderBottomLeftRadius: !top && left ? 18 : 0,
        borderBottomRightRadius: !top && !left ? 18 : 0,
      }}
    />
  );
}

function ToolButton({ icon, label, onPress, active }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; active?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: !!active }} onPress={onPress} style={{ flex: 1, height: 50, borderRadius: radius.md, borderWidth: 1, borderColor: active ? colors.gold : colors.line, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
      <Ionicons name={icon} size={18} color={active ? colors.gold : colors.text} />
      <Text variant="label" color={active ? colors.gold : colors.text}>
        {label}
      </Text>
    </Pressable>
  );
}

function OfflineView({ lastConnected, onRetry, phone, who }: { lastConnected: string; onRetry: () => Promise<boolean>; phone: string; who: string }) {
  const [left, setLeft] = useState(RETRY_SECONDS);
  const [trying, setTrying] = useState(false);

  const retry = useCallback(async () => {
    setTrying(true);
    await onRetry();
    setTrying(false);
    setLeft(RETRY_SECONDS);
  }, [onRetry]);

  useEffect(() => {
    const id = setInterval(() => setLeft((s) => (s <= 1 ? (void retry(), RETRY_SECONDS) : s - 1)), 1000);
    return () => clearInterval(id);
  }, [retry]);

  return (
    <View style={{ flex: 1 }}>
      <View accessibilityRole="alert" style={{ backgroundColor: "#b00a0a", paddingHorizontal: 16, paddingVertical: 14, gap: 4 }}>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <Ionicons name="cloud-offline-outline" size={20} color="#fff" />
          <Text bold color="#fff">
            Can&apos;t reach the server
          </Text>
        </View>
        <Text variant="small" color="rgba(255,255,255,0.9)" style={{ marginLeft: 30 }}>
          Tickets can&apos;t be checked right now. Don&apos;t admit anyone until you&apos;re back online.
        </Text>
      </View>
      <View style={{ alignItems: "center", gap: 10, paddingVertical: 56 }}>
        <Ionicons name="cloud-offline-outline" size={46} color="#ff6b6b" />
        <Text bold>Scanning paused</Text>
        <Text variant="small" color={colors.dim}>
          Retrying in {left} s · last connected {lastConnected}
        </Text>
      </View>
      <View style={{ paddingHorizontal: 16, gap: 14 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Try again now" onPress={() => void retry()} disabled={trying}>
          <LinearGradient colors={[colors.gold, colors.amber]} style={{ height: 52, borderRadius: radius.md, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
            {trying ? <ActivityIndicator color={colors.ink} /> : <Ionicons name="refresh" size={18} color={colors.ink} />}
            <Text bold color={colors.ink}>
              Try again now
            </Text>
          </LinearGradient>
        </Pressable>
        <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: 16, gap: 12 }}>
          <Text variant="heading">While you&apos;re offline</Text>
          {["Turn Wi-Fi off and on, or switch to mobile data.", "Move closer to the door or a window for better signal.", "Ask guests to wait. Don't let anyone in without a check."].map((t, i) => (
            <View key={t} style={{ flexDirection: "row", gap: 12 }}>
              <Text variant="label" color={colors.gold}>
                {i + 1}
              </Text>
              <Text style={{ flex: 1 }}>{t}</Text>
            </View>
          ))}
        </View>
        <Pressable accessibilityRole="link" accessibilityLabel={`Call the organizer, ${who}`} onPress={() => Linking.openURL(`tel:${phone.replace(/[^\d+]/g, "")}`).catch(() => undefined)} style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg }}>
          <Ionicons name="call-outline" size={22} color={colors.gold} />
          <View style={{ flex: 1 }}>
            <Text bold>Call the organizer</Text>
            <Text variant="small" color={colors.muted}>
              {who} · {phone}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.dim} />
        </Pressable>
      </View>
    </View>
  );
}

export default function Scan() {
  const user = useSession();
  const staff = staffFor(user?.email);
  const { eventId, gate } = useStaffState();
  const event = staffEvent(eventId);
  const summary = useSummary(eventId);
  const { online, lastConnected, retry } = useConnection();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [checking, setChecking] = useState<string>();
  const [typeOpen, setTypeOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const busy = useRef(false);
  const last = useRef({ value: "", at: 0 });

  // Coming back from a result screen: scanning is free again, and the result screen may ask for the typing box.
  useFocusEffect(
    useCallback(() => {
      busy.current = false;
      if (scanRequests.typeCode) {
        scanRequests.typeCode = false;
        setTypeOpen(true);
      }
      return () => setTorch(false);
    }, []),
  );

  const run = useCallback(
    (raw: string) => {
      const code = raw.trim().toUpperCase();
      if (!code || busy.current || !staff || !event) return;
      busy.current = true;
      setTypeOpen(false);
      setChecking(code);
      setTimeout(() => {
        const result = checkTicket(event.id, gate, code, staff);
        setChecking(undefined);
        router.push({ pathname: "/staff/result", params: { event: event.id, id: result.id } });
      }, CHECK_MS);
    },
    [event, gate, staff],
  );

  const onScan = useCallback(
    ({ data }: { data: string }) => {
      const now = Date.now();
      // The camera reads one code many times a second; ignore repeats of it for a few seconds.
      if (data === last.current.value && now - last.current.at < 3000) return;
      last.current = { value: data, at: now };
      run(data);
    },
    [run],
  );

  if (!staff || !event) return null;
  const subtitle = `${gate} · ${staff.firstName}`;
  const scanningOpen = event.phase === "today";

  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      <StaffHeader title={event.title} subtitle={subtitle} online={online} onBack={() => router.navigate("/staff")} />

      {!online ? (
        <OfflineView lastConnected={lastConnected} onRetry={async () => { const ok = await retry(); if (!ok) return false; setOffline(false); return true; }} phone={staff.organizerContact.phone} who={staff.organizerContact.name} />
      ) : !scanningOpen ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 14 }}>
          <Ionicons name="calendar-outline" size={44} color={colors.gold} />
          <Text variant="heading" center>
            Scanning isn&apos;t open for this event
          </Text>
          <Text color={colors.muted} center>
            You can scan on the day of the event. Choose today&apos;s event to start.
          </Text>
          <Button title="Back to events" small onPress={() => router.navigate("/staff")} />
        </View>
      ) : (
        <>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0a0908" }}>
            {permission?.granted ? (
              <CameraView style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} facing="back" enableTorch={torch} barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={checking ? undefined : onScan} accessibilityLabel="Camera for scanning ticket QR codes" />
            ) : (
              <View style={{ padding: 28, gap: 12, alignItems: "center" }}>
                <Ionicons name="camera-outline" size={36} color={colors.gold} />
                <Text center color={colors.muted}>
                  {permission && !permission.canAskAgain ? "Camera access is off. Allow it in Settings, or type the ticket code." : "Allow the camera to scan ticket QR codes."}
                </Text>
                {permission && !permission.canAskAgain ? <Button title="Open Settings" small variant="outline" onPress={() => Linking.openSettings().catch(() => undefined)} /> : <Button title="Allow camera" small onPress={() => void requestPermission()} />}
              </View>
            )}

            {permission?.granted && !checking && (
              <View pointerEvents="none" style={{ width: 220, height: 220 }}>
                <Corner pos="tl" />
                <Corner pos="tr" />
                <Corner pos="bl" />
                <Corner pos="br" />
                <View style={{ position: "absolute", left: 14, right: 14, top: 108, height: 2, backgroundColor: colors.gold, opacity: 0.8 }} />
              </View>
            )}
            {permission?.granted && !checking && (
              <View pointerEvents="none" style={{ position: "absolute", bottom: 20, alignItems: "center", gap: 2 }}>
                <Text bold>Point the camera at the QR code</Text>
                <Text variant="small" color={colors.muted}>
                  It scans automatically
                </Text>
              </View>
            )}

            {checking && (
              <View accessibilityLiveRegion="polite" style={{ position: "absolute", left: 40, right: 40, backgroundColor: "rgba(19,17,16,0.96)", borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: 24, alignItems: "center", gap: 12 }}>
                <ActivityIndicator size="large" color={colors.gold} />
                <Text bold>Checking ticket…</Text>
                <Text variant="small" style={{ fontVariant: ["tabular-nums"] }}>
                  {checking}
                </Text>
                <Text variant="small" color={colors.dim} center>
                  Verifying with the SL Events server. Keep the guest at the door.
                </Text>
              </View>
            )}
          </View>

          <View style={{ padding: 16, paddingBottom: 30, gap: 12 }}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <StatTile label="Checked in">
                <Text>
                  <Text style={{ fontSize: 30, lineHeight: 34 }} bold>
                    {summary?.checkedIn ?? 0}
                  </Text>
                  <Text variant="small" color={colors.muted}>
                    {" "}
                    / {event.expected}
                  </Text>
                </Text>
              </StatTile>
              {checking ? (
                <StatTile label="Server">
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success }} />
                    <Text bold color={colors.success}>
                      Responding
                    </Text>
                  </View>
                  <Text variant="small" color={colors.muted}>
                    0.4 s
                  </Text>
                </StatTile>
              ) : (
                <StatTile label="Last scan">
                  {summary?.last ? (
                    <>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
                        <Text bold numberOfLines={1} style={{ flex: 1 }}>
                          {summary.last.name.replace(/^(\S+)\s+(\S).*$/, "$1 $2.")}
                        </Text>
                      </View>
                      <Text variant="small" color={colors.muted}>
                        {summary.last.time}
                      </Text>
                    </>
                  ) : (
                    <Text variant="small" color={colors.dim}>
                      None yet
                    </Text>
                  )}
                </StatTile>
              )}
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <ToolButton icon="flashlight-outline" label="Light" active={torch} onPress={() => setTorch((t) => !t)} />
              <ToolButton icon="keypad-outline" label="Type code" onPress={() => setTypeOpen(true)} />
              <ToolButton icon="swap-horizontal" label="Gate" onPress={() => setGateOpen(true)} />
            </View>
          </View>
        </>
      )}

      <Modal visible={typeOpen} transparent animationType="slide" onRequestClose={() => setTypeOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)" }} onPress={() => setTypeOpen(false)} accessibilityLabel="Close" />
        <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 14, borderWidth: 1, borderColor: colors.line }}>
          <Text variant="heading">Type the ticket code</Text>
          <Field label="Code" value={typed} onChangeText={(v) => setTyped(v.toUpperCase())} autoCapitalize="characters" autoCorrect={false} placeholder="SLE-7K3F-92QD" onSubmitEditing={() => run(typed)} />
          <Button title="Check ticket" onPress={() => run(typed)} disabled={!typed.trim()} />
          <Text variant="label" color={colors.muted}>
            Demo codes
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {demoCodes.map((d) => (
              <Pressable key={d.code} accessibilityRole="button" accessibilityLabel={`${d.code}, ${d.label}`} onPress={() => run(d.code)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface2 }}>
                <Text variant="caption" bold>
                  {d.label}
                </Text>
                <Text variant="caption" color={colors.dim}>
                  {d.code}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      <PickerSheet open={gateOpen} title="Which door are you at?" options={event.gates} value={gate} onPick={selectGate} onClose={() => setGateOpen(false)} />
    </View>
  );
}
