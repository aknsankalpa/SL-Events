import { useState, useSyncExternalStore } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { applicationStore, statusMeta, type Application, type ApplicationStatus } from "@core/organizerApplications";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Field } from "@/ui/Field";
import { Screen } from "@/ui/Screen";
import { Text } from "@/ui/Text";
import { colors } from "@/theme";

const steps = ["Received", "In review", "Decision"] as const;
/** How far along each status is on the three-step line. */
const stepOf: Record<ApplicationStatus, number> = { received: 0, in_review: 1, more_info: 1, approved: 2, declined: 2 };
const dateOf = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** Look up an organizer application by its reference and email, like the website's status page. */
export default function ApplicationStatusScreen() {
  const params = useLocalSearchParams<{ ref?: string; email?: string; sent?: string }>();
  const apps = useSyncExternalStore(applicationStore.subscribe, applicationStore.getSnapshot, applicationStore.getServerSnapshot);
  const [lookup, setLookup] = useState(params.ref && params.email ? { ref: params.ref, email: params.email } : null);
  const [ref, setRef] = useState(params.ref ?? "");
  const [email, setEmail] = useState(params.email ?? "");
  const [errors, setErrors] = useState<{ ref?: string; email?: string }>({});

  const result = lookup ? apps.find((a) => a.ref === lookup.ref.trim().toUpperCase() && a.email === lookup.email.trim().toLowerCase()) : undefined;

  function check() {
    const found: typeof errors = {};
    if (!ref.trim()) found.ref = "Enter the reference we gave you, like ORG-1234.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) found.email = "Enter the email you applied with.";
    setErrors(found);
    if (Object.keys(found).length === 0) setLookup({ ref, email });
  }

  return (
    <Screen style={{ gap: 18 }}>
      {params.sent === "1" && result && (
        <Card style={{ flexDirection: "row", gap: 10, borderColor: colors.success + "66", backgroundColor: colors.success + "14" }}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text variant="small" style={{ flex: 1 }}>
            Thanks, your application is in. Your reference is <Text variant="small" bold>{result.ref}</Text>. Keep it, with your email, to check progress here any time.
          </Text>
        </Card>
      )}

      {result ? (
        <>
          <ResultCard app={result} />
          <Text variant="small" color={colors.gold} bold accessibilityRole="link" onPress={() => setLookup(null)}>
            Check a different application
          </Text>
        </>
      ) : (
        <Card style={{ gap: 14 }}>
          <Text variant="heading">Check your application</Text>
          <Text variant="small" color={colors.muted}>
            Enter your reference and the email you applied with.
          </Text>
          <Field label="Reference" value={ref} onChangeText={setRef} autoCapitalize="characters" placeholder="ORG-1234" error={errors.ref} />
          <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="you@example.com" error={errors.email} />
          {lookup && (
            <Text variant="small" color={colors.danger} accessibilityRole="alert">
              We couldn&apos;t find an application with that reference and email. Check both and try again.
            </Text>
          )}
          <Button title="Check status" onPress={check} />
        </Card>
      )}
    </Screen>
  );
}

function ResultCard({ app }: { app: Application }) {
  const meta = statusMeta[app.status];
  const at = stepOf[app.status];
  const bad = app.status === "declined";
  return (
    <Card style={{ gap: 16 }}>
      <View style={{ gap: 4 }}>
        <Text variant="caption" color={colors.amber} bold style={{ textTransform: "uppercase", letterSpacing: 1 }}>
          Application {app.ref}
        </Text>
        <Text variant="title">{app.organization}</Text>
        <Text variant="small" color={colors.dim}>
          Sent {dateOf(app.submittedAt)} · {app.kind}
        </Text>
        <View style={{ flexDirection: "row", marginTop: 4 }}>
          <Badge label={meta.label} tone={meta.tone} />
        </View>
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between" }} accessibilityLabel={`Progress: ${meta.label}`}>
        {steps.map((label, i) => {
          const done = i < at || (i === at && app.status === "approved");
          const current = i === at;
          const icon = bad && i === 2 ? "close-circle" : done ? "checkmark-circle" : current ? "ellipse" : "ellipse-outline";
          const color = bad && i === 2 ? colors.danger : done ? colors.success : current ? colors.amber : colors.dim;
          return (
            <View key={label} style={{ flex: 1, alignItems: "center", gap: 6 }}>
              <Ionicons name={icon} size={22} color={color} />
              <Text variant="caption" color={current ? colors.text : colors.dim} bold>
                {label}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={{ gap: 6, borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.surface2, padding: 14 }}>
        <Text variant="label">{meta.label}</Text>
        <Text variant="small" color={colors.muted}>
          {meta.summary}
        </Text>
        {app.note && (
          <Text variant="small" style={{ marginTop: 6, borderLeftWidth: 2, borderLeftColor: colors.amber, paddingLeft: 10 }}>
            {app.note}
          </Text>
        )}
      </View>

      {app.status === "more_info" && (
        <Text variant="small" color={colors.muted}>
          Reply to the email we sent you with your reference {app.ref}. We&apos;ll pick the review up again as soon as we hear from you.
        </Text>
      )}
      {app.status === "approved" && <Button title="Log in to the organizer area" onPress={() => router.push("/login")} />}
      {app.status === "declined" && (
        <Text variant="small" color={colors.muted}>
          You can apply again with more detail after 30 days.
        </Text>
      )}

      <View style={{ gap: 4, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 }}>
        <Text variant="caption" color={colors.dim} bold style={{ textTransform: "uppercase" }}>
          Applicant
        </Text>
        <Text variant="small">
          {app.name} · {app.email}
        </Text>
        {app.contact ? (
          <Text variant="small" color={colors.muted}>
            {app.contact}
          </Text>
        ) : null}
        {app.documents.length > 0 && (
          <Text variant="small" color={colors.muted}>
            Documents: {app.documents.map((d) => d.name).join(", ")}
          </Text>
        )}
      </View>
    </Card>
  );
}
