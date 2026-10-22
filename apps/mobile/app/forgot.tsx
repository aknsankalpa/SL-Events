import { useState } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { AuthShell } from "@/ui/AuthShell";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { Text } from "@/ui/Text";
import { colors } from "@/theme";

export default function Forgot() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [sentTo, setSentTo] = useState<string>();

  function submit() {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter the email you signed up with.");
    setError(undefined);
    // TODO: call the password-reset API.
    setSentTo(email.trim());
  }

  return (
    <AuthShell title="Forgot your password?" subtitle="Enter the email you signed up with. We will send you a link to choose a new password.">
      {sentTo ? (
        <View accessibilityRole="alert" style={{ flexDirection: "row", gap: 12, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.success + "66", backgroundColor: colors.success + "1a" }}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={{ flex: 1 }}>
            If an account exists for <Text bold>{sentTo}</Text>, a reset link is on its way.
          </Text>
        </View>
      ) : (
        <>
          <Field label="Email" value={email} onChangeText={setEmail} error={error} keyboardType="email-address" autoComplete="email" placeholder="you@example.com" onSubmitEditing={submit} />
          <Button title="Send reset link" onPress={submit} />
        </>
      )}
      <Button title="Back to log in" variant="ghost" onPress={() => router.replace("/login")} />
    </AuthShell>
  );
}
