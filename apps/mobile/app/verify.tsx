import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { markVerified, safeNext, signIn } from "@core/session";
import { AuthShell } from "@/ui/AuthShell";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { Text } from "@/ui/Text";
import { colors } from "@/theme";

/** Confirms the address with the 6-digit code we email. Anyone can also skip and verify later from their profile. */
export default function Verify() {
  const { email = "", next } = useLocalSearchParams<{ email?: string; next?: string }>();
  const target = safeNext(next, "/");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [wait, setWait] = useState(30);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  function submit() {
    if (!/^\d{6}$/.test(code.replace(/\s/g, ""))) return setError("Enter the 6-digit code from the email.");
    // TODO: check the code with the auth API. The mock accepts any 6 digits.
    markVerified(email);
    router.replace(target as never);
  }

  function skip() {
    signIn(email);
    router.replace(target as never);
  }

  return (
    <AuthShell title="Check your email" subtitle={`We sent a 6-digit code to ${email}. Enter it below to confirm your address.`}>
      <Field label="Verification code" value={code} onChangeText={(v) => { setCode(v); setError(undefined); }} error={error} keyboardType="number-pad" maxLength={7} autoComplete="one-time-code" placeholder="123456" onSubmitEditing={submit} />
      <Button title="Verify" onPress={submit} />
      <Button
        title={wait > 0 ? `Send a new code in ${wait}s` : "Send a new code"}
        variant="ghost"
        disabled={wait > 0}
        onPress={() => {
          // TODO: ask the auth API to send a new code.
          setWait(30);
          setResent(true);
        }}
      />
      {resent && (
        <Text variant="small" color={colors.success} center accessibilityLiveRegion="polite">
          A new code is on its way.
        </Text>
      )}
      <Text center variant="small" color={colors.gold} bold onPress={skip} accessibilityRole="link">
        Skip for now
      </Text>
    </AuthShell>
  );
}
