import { useState } from "react";
import { Alert, Platform, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { deleteAccount, signOut, updateProfile } from "@core/session";
import { historyTotals } from "@core/bookings";
import { formatKrw } from "@core/format";
import { useBookings, useSession } from "@/lib/hooks";
import { homeForRole, roleLabels, rolesFor } from "@/lib/roles";
import { setView } from "@/lib/view";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Field } from "@/ui/Field";
import { Screen } from "@/ui/Screen";
import { SignInPrompt } from "@/ui/SignInPrompt";
import { Text } from "@/ui/Text";
import { colors } from "@/theme";

function MenuRow({ icon, label, sub, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; sub?: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14 })}>
      <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: colors.gold + "22", alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={18} color={colors.gold} />
      </View>
      <View style={{ flex: 1 }}>
        <Text bold>{label}</Text>
        {sub && (
          <Text variant="small" color={colors.dim}>
            {sub}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.dim} />
    </Pressable>
  );
}

/** Works on phones (Alert with buttons) and on the web preview (window.confirm), where Alert buttons do nothing. */
function confirm(title: string, message: string, action: string, run: () => void) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) run();
    return;
  }
  Alert.alert(title, message, [{ text: "Cancel", style: "cancel" }, { text: action, style: "destructive", onPress: run }]);
}

export default function Profile() {
  const user = useSession();
  const bookings = useBookings();
  const [name, setName] = useState<string>();
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);

  if (!user) {
    return (
      <Screen topInset>
        <Text variant="display">Profile</Text>
        <SignInPrompt icon="person-outline" title="Log in to your account" body="Keep your tickets, bookings and details in one place." />
        <Card>
          <MenuRow icon="help-circle-outline" label="Help and FAQ" sub="Payments, tickets, contact" onPress={() => router.push("/help")} />
          <View style={{ height: 1, backgroundColor: colors.line }} />
          <MenuRow icon="id-card-outline" label="Event staff sign in" sub="For door staff invited by an organizer" onPress={() => router.push("/staff/login")} />
        </Card>
      </Screen>
    );
  }

  const totals = historyTotals(bookings);
  // An organizer or admin account that is using the customer view can go back to its own area from here.
  const otherRole = rolesFor(user.email).find((r) => r !== "customer" && r !== "visitor");
  const draft = name ?? user.name;

  function save() {
    if (!draft.trim()) return setError("Enter your name.");
    setError(undefined);
    // TODO: save the profile through the API.
    updateProfile({ name: draft });
    setName(undefined);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <Screen topInset>
      <Text variant="display">Profile</Text>

      <Card style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: colors.gold + "99", backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center" }}>
          <Text variant="heading" color={colors.gold}>
            {user.initials}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="heading">{user.name}</Text>
          <Text variant="small" color={colors.muted}>
            {user.email}
          </Text>
        </View>
      </Card>

      {!user.verified && (
        <Card style={{ gap: 10, borderColor: colors.warning + "88" }}>
          <Text bold>Verify your email</Text>
          <Text variant="small" color={colors.muted}>
            Confirm {user.email} to keep your account safe.
          </Text>
          <Button title="Verify now" small variant="outline" onPress={() => router.push({ pathname: "/verify", params: { email: user.email, next: "/profile" } })} />
        </Card>
      )}

      <View style={{ flexDirection: "row", gap: 12 }}>
        <Card style={{ flex: 1, gap: 2 }}>
          <Text variant="title">{totals.bookings}</Text>
          <Text variant="small" color={colors.muted}>
            Bookings
          </Text>
        </Card>
        <Card style={{ flex: 1.4, gap: 2 }}>
          <Text variant="title">{formatKrw(totals.totalPaid)}</Text>
          <Text variant="small" color={colors.muted}>
            Total paid
          </Text>
        </Card>
      </View>

      <Card style={{ gap: 14 }}>
        <Text variant="heading">Your details</Text>
        <Field label="Name" value={draft} onChangeText={setName} error={error} autoCapitalize="words" />
        <Field label="Email" value={user.email} editable={false} hint="Your email identifies your account and bookings, so it cannot be changed here." />
        <Button title={saved ? "Saved" : "Save changes"} small onPress={save} disabled={name === undefined || name.trim() === user.name} />
      </Card>

      <Card style={{ paddingVertical: 2 }}>
        <MenuRow icon="help-circle-outline" label="Help and FAQ" sub="Payments, tickets, contact" onPress={() => router.push("/help")} />
        <View style={{ height: 1, backgroundColor: colors.line }} />
        <MenuRow icon="scan-outline" label="Ticket scanner" sub="For organizers and door staff" onPress={() => router.push("/scanner")} />
        {otherRole && (
          <>
            <View style={{ height: 1, backgroundColor: colors.line }} />
            <MenuRow
              icon="swap-horizontal-outline"
              label={`Switch to ${roleLabels[otherRole]} view`}
              sub="You have more than one role on this account"
              onPress={() => {
                setView(user.email, otherRole);
                router.replace(homeForRole(otherRole));
              }}
            />
          </>
        )}
      </Card>

      <Button
        title="Log out"
        variant="outline"
        onPress={() => {
          signOut();
          router.replace("/");
        }}
      />
      <Text
        variant="small"
        color={colors.danger}
        center
        accessibilityRole="button"
        onPress={() =>
          confirm("Delete your account?", "Your account closes and you are signed out. Payment records are kept for the period the law requires.", "Delete", () => {
            deleteAccount(user.email);
            router.replace("/");
          })
        }
      >
        Delete my account
      </Text>
    </Screen>
  );
}
