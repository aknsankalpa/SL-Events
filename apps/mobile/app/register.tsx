import { useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { safeNext } from "@core/session";
import { account } from "@/lib/account";
import { AuthShell } from "@/ui/AuthShell";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { Text } from "@/ui/Text";
import { colors } from "@/theme";

type Errors = Partial<Record<"name" | "email" | "password" | "confirm" | "terms", string>>;

export default function Register() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const target = safeNext(next, "/");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string>();

  async function submit() {
    const found: Errors = {};
    if (!form.name.trim()) found.name = "Enter your name.";
    if (!form.email.trim().includes("@")) found.email = "Enter a valid email address.";
    if (form.password.length < 8) found.password = "Use at least 8 characters.";
    if (form.confirm !== form.password) found.confirm = "Passwords do not match.";
    if (!terms) found.terms = "You need to accept the terms to continue.";
    setErrors(found);
    if (Object.keys(found).length || busy) return;
    // The website creates the account, signs this phone in and sends the confirmation code.
    setBusy(true);
    setFormError(undefined);
    const result = await account.register(form.name.trim(), form.email.trim(), form.password);
    setBusy(false);
    if (!result.ok) {
      if (result.errors) setErrors(result.errors as Errors);
      return setFormError(result.error);
    }
    router.replace({ pathname: "/verify", params: { email: result.user.email, next: target, ...(result.devCode ? { devCode: result.devCode } : {}) } });
  }

  return (
    <AuthShell title="Create your account" subtitle="It takes a minute. You will use it to book and keep your tickets.">
      <View style={{ gap: 16 }}>
        <Field label="Name" value={form.name} onChangeText={set("name")} error={errors.name} autoCapitalize="words" autoComplete="name" placeholder="Your name" />
        <Field label="Email" value={form.email} onChangeText={set("email")} error={errors.email} keyboardType="email-address" autoComplete="email" placeholder="you@example.com" />
        <Field label="Password" value={form.password} onChangeText={set("password")} error={errors.password} password hint="At least 8 characters." autoComplete="new-password" />
        <Field label="Confirm password" value={form.confirm} onChangeText={set("confirm")} error={errors.confirm} password autoComplete="new-password" />
        <View style={{ gap: 6 }}>
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: terms }} onPress={() => setTerms((t) => !t)} style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: terms ? colors.amber : colors.line, backgroundColor: terms ? colors.amber : colors.surface2, alignItems: "center", justifyContent: "center" }}>
              {terms && <Ionicons name="checkmark" size={14} color={colors.ink} />}
            </View>
            <Text variant="small" color={colors.muted} style={{ flex: 1 }}>
              I accept the terms and the privacy policy.
            </Text>
          </Pressable>
          {errors.terms && (
            <Text variant="small" color={colors.danger}>
              {errors.terms}
            </Text>
          )}
        </View>
      </View>
      {formError && (
        <Text variant="small" color={colors.danger} accessibilityRole="alert">
          {formError}
        </Text>
      )}
      <Button title={busy ? "Creating account…" : "Create account"} onPress={() => void submit()} disabled={busy} />
      <Text center color={colors.muted}>
        Already have an account?{" "}
        <Text color={colors.gold} bold onPress={() => router.replace({ pathname: "/login", params: { next: target } })} accessibilityRole="link">
          Log in
        </Text>
      </Text>
    </AuthShell>
  );
}
