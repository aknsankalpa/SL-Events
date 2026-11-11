import { useEffect, useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { safeNext } from "@core/session";
import { account } from "@/lib/account";
import { AuthShell } from "@/ui/AuthShell";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { Text } from "@/ui/Text";
import { colors } from "@/theme";

/** Confirms the address with the 6-digit code the website sends. Anyone can also skip and confirm later. */
export default function Verify() {
  const { email = "", next, devCode } = useLocalSearchParams<{ email?: string; next?: string; devCode?: string }>();
  const target = safeNext(next, "/");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [wait, setWait] = useState(30);
  const [resent, setResent] = useState(false);
  const [shownCode, setShownCode] = useState(devCode);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  async function submit() {
    const clean = code.replace(/\s/g, "");
    if (!/^\d{6}$/.test(clean)) return setError("Enter the 6-digit code from the email.");
    setBusy(true);
    const result = await account.verifyEmail(email, clean);
    setBusy(false);
    if (!result.ok) return setError(result.error ?? "That code isn't right.");
    router.replace(target as never);
  }

  async function resend() {
    const result = await account.resendCode(email);
    setWait(30);
    setResent(result.ok);
    if (result.ok && result.devCode) setShownCode(result.devCode);
    if (!result.ok) setError(result.error);
  }

  return (
    <AuthShell title="Check your email" subtitle={`We sent a 6-digit code to ${email}. Enter it below to confirm your address.`}>
      {shownCode && (
        <View style={{ borderWidth: 1, borderColor: colors.gold + "66", backgroundColor: "#2a200a", borderRadius: 10, padding: 12 }}>
          <Text variant="small" color={colors.gold}>
            Development only (emails aren&apos;t sent yet): your code is <Text bold color={colors.gold}>{shownCode}</Text>
          </Text>
        </View>
      )}
      <Field label="Verification code" value={code} onChangeText={(v) => { setCode(v); setError(undefined); }} error={error} keyboardType="number-pad" maxLength={7} autoComplete="one-time-code" placeholder="123456" onSubmitEditing={() => void submit()} />
      <Button title={busy ? "Checking…" : "Verify"} onPress={() => void submit()} disabled={busy} />
      <Button title={wait > 0 ? `Send a new code in ${wait}s` : "Send a new code"} variant="ghost" disabled={wait > 0} onPress={() => void resend()} />
      {resent && (
        <Text variant="small" color={colors.success} center accessibilityLiveRegion="polite">
          A new code is on its way.
        </Text>
      )}
      <Text center variant="small" color={colors.gold} bold onPress={() => router.replace(target as never)} accessibilityRole="link">
        Skip for now
      </Text>
    </AuthShell>
  );
}
