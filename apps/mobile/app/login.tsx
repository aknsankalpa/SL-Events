import { useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { safeNext, signIn } from "@core/session";
import { homeFor } from "@/lib/roles";
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

  function submit() {
    const found: typeof errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) found.email = "Enter a valid email address.";
    if (!password) found.password = "Enter your password.";
    setErrors(found);
    if (Object.keys(found).length) return;
    // TODO: check the password with the auth API; for now any valid email and password signs in.
    const user = signIn(email.trim());
    // Door staff go to their own area whatever page they came from.
    if (homeFor(user.email) === "/staff") router.replace("/staff");
    else if (user.verified) router.replace(target as never);
    else router.replace({ pathname: "/verify", params: { email: user.email, next: target } });
  }

  return (
    <AuthShell title="Log in" subtitle={target !== "/" ? "Log in to continue. You will come straight back." : "See your tickets and book faster."}>
      <View style={{ gap: 16 }}>
        <Field label="Email" value={email} onChangeText={setEmail} error={errors.email} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" placeholder="you@example.com" />
        <Field label="Password" value={password} onChangeText={setPassword} error={errors.password} password autoComplete="password" textContentType="password" placeholder="Your password" onSubmitEditing={submit} />
        <Text variant="small" color={colors.gold} bold onPress={() => router.push("/forgot")} accessibilityRole="link" style={{ alignSelf: "flex-end" }}>
          Forgot password?
        </Text>
      </View>
      <Button title="Log in" onPress={submit} />
      <Text center color={colors.muted}>
        New here?{" "}
        <Text color={colors.gold} bold onPress={() => router.replace({ pathname: "/register", params: { next: target } })} accessibilityRole="link">
          Create an account
        </Text>
      </Text>
      <Text variant="small" color={colors.gold} bold center onPress={() => router.push("/staff/login")} accessibilityRole="link">
        Event staff? Sign in here
      </Text>
      <Text variant="small" color={colors.dim} center>
        Demo: any valid email and password works. kasun@example.com has sample bookings.
      </Text>
    </AuthShell>
  );
}
