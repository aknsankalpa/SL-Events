import { useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { safeNext } from "@core/session";
import { account } from "@/lib/account";
import { homeFor } from "@/lib/view";
import { AuthShell } from "@/ui/AuthShell";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { Text } from "@/ui/Text";
import { colors } from "@/theme";

export default function Login() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const target = safeNext(next, "/");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const [busy, setBusy] = useState(false);

  async function submit() {
    const found: typeof errors = {};
    if (!email.trim().includes("@")) found.email = "Enter a valid email address.";
    if (!password) found.password = "Enter your password.";
    setErrors(found);
    if (Object.keys(found).length || busy) return;
    // The website checks the password and says which roles the account holds.
    setBusy(true);
    const result = await account.login(email.trim(), password);
    setBusy(false);
    if (!result.ok) return setErrors({ password: result.error ?? "That email and password don't match an account." });
    const user = result.user;
    // Staff, organizers and admins go to their own area whatever page they came from.
    const home = homeFor(user.email);
    if (home !== "/") router.replace(home);
    else if (user.verified) router.replace(target as never);
    else router.replace({ pathname: "/verify", params: { email: user.email, next: target } });
  }

  return (
    <AuthShell title="Log in" subtitle={target !== "/" ? "Log in to continue. You will come straight back." : "See your tickets and book faster."}>
      <View style={{ gap: 16 }}>
        <Field label="Email" value={email} onChangeText={setEmail} error={errors.email} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" placeholder="you@example.com" />
        <Field label="Password" value={password} onChangeText={setPassword} error={errors.password} password autoComplete="password" textContentType="password" placeholder="Your password" onSubmitEditing={() => void submit()} />
        <Text variant="small" color={colors.gold} bold onPress={() => router.push("/forgot")} accessibilityRole="link" style={{ alignSelf: "flex-end" }}>
          Forgot password?
        </Text>
      </View>
      <Button title={busy ? "Logging in…" : "Log in"} onPress={() => void submit()} disabled={busy} />
      <Text center color={colors.muted}>
        New here?{" "}
        <Text color={colors.gold} bold onPress={() => router.replace({ pathname: "/register", params: { next: target } })} accessibilityRole="link">
          Create an account
        </Text>
      </Text>
      <Text variant="small" color={colors.gold} bold center onPress={() => router.push("/staff/login")} accessibilityRole="link">
        Event staff? Sign in here
      </Text>
    </AuthShell>
  );
}
