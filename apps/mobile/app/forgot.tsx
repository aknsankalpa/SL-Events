import { useState } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { account } from "@/lib/account";
import { AuthShell } from "@/ui/AuthShell";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { Text } from "@/ui/Text";
import { colors } from "@/theme";

/** Resets a forgotten password: the website emails a 6-digit code, which is entered here with the new password. */
export default function Forgot() {
  const [step, setStep] = useState<"email" | "code" | "done">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [devCode, setDevCode] = useState<string>();
  const [errors, setErrors] = useState<Partial<Record<"email" | "code" | "password" | "confirm", string>>>({});
  const [busy, setBusy] = useState(false);

  async function sendCode() {
    if (!email.trim().includes("@")) return setErrors({ email: "Enter the email you signed up with." });
    setBusy(true);
    const result = await account.forgotPassword(email.trim());
    setBusy(false);
    if (!result.ok) return setErrors({ email: result.error });
    setErrors({});
    setDevCode(result.devCode);
    setStep("code");
  }

  async function reset() {
    const found: typeof errors = {};
    if (!/^\d{6}$/.test(code.replace(/\s/g, ""))) found.code = "Enter the 6-digit code from the email.";
    if (password.length < 8) found.password = "Use at least 8 characters.";
    if (confirm !== password) found.confirm = "Passwords do not match.";
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    const result = await account.resetPassword(email.trim(), code.replace(/\s/g, ""), password);
    setBusy(false);
    if (!result.ok) return setErrors({ ...(result.errors ?? {}), ...(result.error ? { code: result.error } : {}) });
    setStep("done");
  }

  return (
    <AuthShell
      title={step === "done" ? "Password updated" : "Forgot your password?"}
      subtitle={step === "email" ? "Enter the email you signed up with. We will send you a code to choose a new password." : step === "code" ? `If an account exists for ${email.trim()}, a 6-digit code is on its way.` : "Log in with your new password. Other phones and computers were signed out."}
    >
      {step === "email" && (
        <>
          <Field label="Email" value={email} onChangeText={setEmail} error={errors.email} keyboardType="email-address" autoComplete="email" placeholder="you@example.com" onSubmitEditing={() => void sendCode()} />
          <Button title={busy ? "Sending…" : "Send reset code"} onPress={() => void sendCode()} disabled={busy} />
        </>
      )}
      {step === "code" && (
        <>
          {devCode && (
            <Text variant="small" color={colors.gold}>
              Development only (emails aren&apos;t sent yet): your code is <Text bold color={colors.gold}>{devCode}</Text>
            </Text>
          )}
          <View style={{ gap: 16 }}>
            <Field label="Code from the email" value={code} onChangeText={setCode} error={errors.code} keyboardType="number-pad" maxLength={7} autoComplete="one-time-code" placeholder="123456" />
            <Field label="New password" value={password} onChangeText={setPassword} error={errors.password} password hint="At least 8 characters." autoComplete="new-password" />
            <Field label="Confirm new password" value={confirm} onChangeText={setConfirm} error={errors.confirm} password autoComplete="new-password" onSubmitEditing={() => void reset()} />
          </View>
          <Button title={busy ? "Saving…" : "Update password"} onPress={() => void reset()} disabled={busy} />
        </>
      )}
      {step === "done" && (
        <View accessibilityRole="alert" style={{ flexDirection: "row", gap: 12, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.success + "66", backgroundColor: colors.success + "1a" }}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={{ flex: 1 }}>Your password is updated.</Text>
        </View>
      )}
      <Button title="Back to log in" variant={step === "done" ? "primary" : "ghost"} onPress={() => router.replace("/login")} />
    </AuthShell>
  );
}
