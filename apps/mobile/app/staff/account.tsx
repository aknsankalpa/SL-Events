import { Linking, Pressable, Switch, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, router } from "expo-router";
import { signOut } from "@core/session";
import { useSession } from "@/lib/hooks";
import { staffFor } from "@/lib/roles";
import { staffEvent } from "@/staff/data";
import { setOffline, useStaffState } from "@/staff/store";
import { Button } from "@/ui/Button";
import { Card, Row } from "@/ui/Card";
import { Screen } from "@/ui/Screen";
import { Text } from "@/ui/Text";
import { colors } from "@/theme";

/** The staff member's account: who they are, who to call, and sign out. */
export default function StaffAccount() {
  const user = useSession();
  const staff = staffFor(user?.email);
  const { offline, gate, eventId } = useStaffState();
  if (!staff) return <Redirect href="/staff/login" />;

  const event = staffEvent(eventId);
  return (
    <Screen topInset style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text variant="display">Account</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={26} color={colors.text} />
        </Pressable>
      </View>

      <Card style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: colors.gold + "99", backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center" }}>
          <Text variant="heading" color={colors.gold}>
            {staff.initials}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="heading">{staff.name}</Text>
          <Text variant="small" color={colors.muted}>
            {staff.email}
          </Text>
        </View>
      </Card>

      <Card>
        <Row label="Role" value={staff.roleLabel} />
        <Row label="Organizer" value={staff.organizer} />
        <Row label="Assigned events" value={String(staff.events.length)} />
        {event && <Row label="Working now" value={`${event.title} · ${gate}`} />}
      </Card>

      <Pressable accessibilityRole="link" accessibilityLabel={`Call the organizer, ${staff.organizerContact.name}`} onPress={() => Linking.openURL(`tel:${staff.organizerContact.phone.replace(/[^\d+]/g, "")}`).catch(() => undefined)}>
        <Card style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Ionicons name="call-outline" size={22} color={colors.gold} />
          <View style={{ flex: 1 }}>
            <Text bold>Call the organizer</Text>
            <Text variant="small" color={colors.muted}>
              {staff.organizerContact.name} · {staff.organizerContact.phone}
            </Text>
          </View>
        </Card>
      </Pressable>

      <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text bold>Pretend there&apos;s no connection</Text>
          <Text variant="small" color={colors.muted}>
            For trying the offline screen. Turns off by itself when you tap Try again and the phone has signal.
          </Text>
        </View>
        <Switch value={offline} onValueChange={setOffline} accessibilityLabel="Pretend there is no connection" trackColor={{ true: colors.amber, false: colors.line }} thumbColor="#fff" />
      </Card>

      <Button
        title="Sign out"
        variant="outline"
        onPress={() => {
          signOut();
          router.dismissAll();
          router.replace("/staff/login");
        }}
      />
    </Screen>
  );
}
