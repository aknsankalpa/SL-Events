import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { signIn } from "@core/session";
import { staffFor } from "@/lib/roles";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { Screen } from "@/ui/Screen";
import { Text } from "@/ui/Text";
import { colors } from "@/theme";

/** Door staff sign in with the account their organizer invited. Only events they were assigned to appear. */
export default function StaffLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  function submit() {
    const found: typeof errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) found.email = "Enter a valid email address.";
    else if (!staffFor(email)) found.email = "This email isn't on a door-staff team. Ask your event organizer to invite you.";
    if (!password) found.password = "Enter your password.";
    setErrors(found);
    if (Object.keys(found).length) return;
    // TODO: check the password with the auth API; the account's role comes from the server.
    signIn(email.trim());
    router.replace("/staff");
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#000" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <LinearGradient pointerEvents="none" colors={["transparent", "#3a0808"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 300 }} />
      <Screen topInset style={{ gap: 18 }}>
        <View style={{ alignItems: "center", gap: 10, marginTop: 24 }}>
          <Image source={require("../../assets/logo.jpg")} style={{ width: 190, height: 80 }} resizeMode="contain" accessibilityLabel="SL Events" />
          <View style={{ backgroundColor: "#2a2008", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: colors.gold + "33" }}>
            <Text variant="caption" bold color={colors.gold} style={{ letterSpacing: 1 }}>
              DOOR STAFF
            </Text>
          </View>
        </View>

        <View style={{ alignItems: "center", gap: 8, marginTop: 8 }}>
          <Text variant="display" center style={{ fontSize: 30 }}>
            Check in guests
          </Text>
          <Text color={colors.muted} center>
            Sign in with the account your organizer invited.
          </Text>
        </View>

        <View style={{ gap: 16, marginTop: 12 }}>
          <Field label="Email" value={email} onChangeText={setEmail} error={errors.email} keyboardType="email-address" autoComplete="email" placeholder="you@example.com" />
          <Field label="Password" value={password} onChangeText={setPassword} error={errors.password} password autoComplete="password" placeholder="Your password" onSubmitEditing={submit} />
        </View>
        <Button title="Sign in" onPress={submit} />

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Ionicons name="shield-checkmark-outline" size={14} color={colors.success} />
          <Text variant="small" color={colors.muted}>
            Only events you&apos;re assigned to will appear.
          </Text>
        </View>

        <View style={{ flex: 1 }} />
        <Text variant="small" color={colors.dim} center style={{ marginTop: 40 }}>
          Trouble signing in? Ask your event organizer.
        </Text>
        <Text variant="small" color={colors.gold} bold center onPress={() => router.replace("/login")} accessibilityRole="link">
          Not event staff? Use the main sign in
        </Text>
        <Text variant="caption" color={colors.dim} center>
          Demo: ishara@slevents.kr with any password
        </Text>
      </Screen>
    </KeyboardAvoidingView>
  );
}
