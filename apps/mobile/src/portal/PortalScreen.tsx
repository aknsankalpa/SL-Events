import { useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { signOut } from "@core/session";
import { useSession } from "@/lib/hooks";
import { homeForRole, portalFor, roleLabels, rolesFor, type Role } from "@/lib/roles";
import { isValidSiteUrl, setSiteUrl, useSiteUrl } from "@/lib/site";
import { setView } from "@/lib/view";
import { PickerSheet } from "@/staff/ui";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { Text } from "@/ui/Text";
import { colors } from "@/theme";
import { PortalFrame } from "./PortalFrame";

type Section = "organizer" | "admin";
const meta: Record<Section, { title: string; path: string }> = {
  organizer: { title: "Organizer", path: "/organizer" },
  admin: { title: "Admin", path: "/admin" },
};

/**
 * The organizer and admin areas are the website's own mobile view, shown inside the app so every function the
 * website has is here too. A thin bar on top keeps the app's own controls: reload, switch role, sign out.
 */
export function PortalScreen({ section }: { section: Section }) {
  const insets = useSafeAreaInsets();
  const user = useSession();
  const base = useSiteUrl();
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [problem, setProblem] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [switching, setSwitching] = useState(false);
  const [address, setAddress] = useState("");
  const [addressError, setAddressError] = useState<string>();

  const roles = rolesFor(user?.email);
  const portal = portalFor(user?.email);
  const url = `${base}${meta[section].path}`;

  const reload = () => {
    setState("loading");
    setReloadKey((k) => k + 1);
  };
  const leave = () => {
    signOut();
    router.replace("/login");
  };
  const switchTo = (label: string) => {
    const role = (Object.keys(roleLabels) as Role[]).find((r) => roleLabels[r] === label);
    if (!role || !user) return;
    setView(user.email, role);
    router.replace(homeForRole(role));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      <View style={{ paddingTop: insets.top + 6, paddingBottom: 8, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line }}>
        <View style={{ backgroundColor: colors.gold + "22", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text variant="caption" bold color={colors.gold} style={{ textTransform: "uppercase", letterSpacing: 0.8 }}>
            {meta[section].title}
          </Text>
        </View>
        <Text variant="small" color={colors.muted} numberOfLines={1} style={{ flex: 1 }}>
          {portal?.name ?? user?.name ?? ""}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Reload" onPress={reload} hitSlop={10}>
          <Ionicons name="refresh" size={20} color={colors.text} />
        </Pressable>
        {roles.length > 1 && (
          <Pressable accessibilityRole="button" accessibilityLabel="Switch view" onPress={() => setSwitching(true)} hitSlop={10}>
            <Ionicons name="swap-horizontal" size={20} color={colors.text} />
          </Pressable>
        )}
        <Pressable accessibilityRole="button" accessibilityLabel="Sign out" onPress={leave} hitSlop={10}>
          <Ionicons name="log-out-outline" size={20} color={colors.text} />
        </Pressable>
      </View>

      <View style={{ flex: 1 }}>
        {state !== "error" && (
          <PortalFrame
            url={url}
            base={base}
            reloadKey={reloadKey}
            onLoaded={() => setState((s) => (s === "error" ? s : "ready"))}
            onFailed={(m) => {
              setProblem(m);
              setState("error");
            }}
            onLogout={leave}
            onEvent={(slug) => router.push(`/event/${slug}` as never)}
          />
        )}

        {state === "loading" && (
          <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: colors.page }}>
            <ActivityIndicator color={colors.gold} size="large" />
            <Text variant="small" color={colors.muted} style={{ marginTop: 12 }}>
              Opening the {meta[section].title.toLowerCase()} area…
            </Text>
          </View>
        )}

        {state === "error" && (
          <View accessibilityRole="alert" style={{ flex: 1, padding: 24, gap: 14, justifyContent: "center" }}>
            <Ionicons name="cloud-offline-outline" size={40} color="#ff6b6b" style={{ alignSelf: "center" }} />
            <Text variant="heading" center>
              Can&apos;t reach the website
            </Text>
            <Text color={colors.muted} center>
              The {meta[section].title.toLowerCase()} area is the website, so the phone needs to reach it. Check your connection, and that the website is running at this address:
            </Text>
            <Text bold center selectable style={{ fontVariant: ["tabular-nums"] }}>
              {base}
            </Text>
            <Text variant="small" color={colors.dim} center>
              {problem}
            </Text>
            <Field label="Website address" value={address} onChangeText={(v) => { setAddress(v); setAddressError(undefined); }} placeholder="http://192.168.0.10:3000" keyboardType="url" autoCorrect={false} error={addressError} hint="A phone can't use localhost. Use your computer's address on the same Wi-Fi, or the real website once it is online." />
            <Button
              title="Use this address and try again"
              variant="outline"
              small
              onPress={() => {
                if (address.trim() && !isValidSiteUrl(address.trim())) return setAddressError("Enter a full address, like http://192.168.0.10:3000");
                setSiteUrl(address);
                reload();
              }}
            />
            <Button title="Try again" onPress={reload} />
          </View>
        )}
      </View>

      <PickerSheet open={switching} title="Switch view" options={roles.map((r) => roleLabels[r])} value={roleLabels[section]} onPick={switchTo} onClose={() => setSwitching(false)} />
    </View>
  );
}
