import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { eventKinds, openApplicationFor, submitApplication } from "@core/organizerApplications";
import { useSession } from "@/lib/hooks";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Field } from "@/ui/Field";
import { Screen } from "@/ui/Screen";
import { Select } from "@/ui/Select";
import { Text } from "@/ui/Text";
import { colors, fonts, radius } from "@/theme";

const MAX_FILES = 3;
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = ["application/pdf", "image/png", "image/jpeg"];

type Errors = Partial<Record<"name" | "email" | "organization" | "about" | "terms" | "documents", string>>;
type Doc = { name: string; size: number };

const formatSize = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

const steps = [
  { icon: "clipboard-outline" as const, title: "Apply", body: "Fill in this short form. It takes about five minutes." },
  { icon: "search-outline" as const, title: "We review", body: "Our team reads it within 2 working days and may ask a question by email." },
  { icon: "mail-open-outline" as const, title: "You hear from us", body: "We email the decision. Approved organizers can log in and create their first event." },
];

/** The same short application as the website: five things we need, three we'd like, nothing tied to a country. */
export default function BecomeOrganizer() {
  const user = useSession();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [contact, setContact] = useState("");
  const [organization, setOrganization] = useState("");
  const [kind, setKind] = useState(eventKinds[0]!);
  const [about, setAbout] = useState("");
  const [link, setLink] = useState("");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [aboutFocus, setAboutFocus] = useState(false);
  const [existing, setExisting] = useState<{ ref: string; email: string }>();

  async function attach() {
    const result = await DocumentPicker.getDocumentAsync({ type: ACCEPT, multiple: true, copyToCacheDirectory: false });
    if (result.canceled) return;
    const incoming = result.assets.map((a) => ({ name: a.name, size: a.size ?? 0, type: a.mimeType ?? "" }));
    const bad = incoming.find((f) => f.type && !ACCEPT.includes(f.type));
    if (bad) return setErrors((e) => ({ ...e, documents: `${bad.name} isn't a PDF, PNG or JPG.` }));
    const big = incoming.find((f) => f.size > MAX_BYTES);
    if (big) return setErrors((e) => ({ ...e, documents: `${big.name} is larger than 5 MB.` }));
    const next = [...docs, ...incoming.map(({ name: n, size }) => ({ name: n, size }))];
    if (next.length > MAX_FILES) return setErrors((e) => ({ ...e, documents: `Attach up to ${MAX_FILES} files.` }));
    setErrors((e) => ({ ...e, documents: undefined }));
    setDocs(next);
  }

  function send() {
    const found: Errors = {};
    if (!name.trim()) found.name = "Enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) found.email = "Enter a valid email address.";
    if (!organization.trim()) found.organization = "Enter the name of your group, business or team.";
    if (about.trim().length < 20) found.about = "Tell us a little more: a sentence or two is enough.";
    if (!terms) found.terms = "Please accept the organizer terms to apply.";
    setErrors((cur) => ({ ...found, documents: cur.documents }));
    if (Object.keys(found).length) return;

    const open = openApplicationFor(email);
    if (open) {
      setExisting({ ref: open.ref, email: open.email });
      return;
    }
    // TODO: POST the application and upload the attached files through the API.
    const app = submitApplication({
      name: name.trim(),
      email: email.trim(),
      contact: contact.trim(),
      organization: organization.trim(),
      kind,
      about: about.trim(),
      link: link.trim(),
      documents: docs,
    });
    router.replace({ pathname: "/become-organizer/status", params: { ref: app.ref, email: app.email, sent: "1" } });
  }

  return (
    <Screen style={{ gap: 20 }}>
      <View style={{ gap: 6 }}>
        <Text variant="display">Become an organizer</Text>
        <Text color={colors.muted}>Sell tickets to the community, check people in with QR codes and see your sales in one place.</Text>
      </View>

      <Card style={{ gap: 14 }}>
        {steps.map((s, i) => (
          <View key={s.title} style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.gold + "22", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={s.icon} size={17} color={colors.gold} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="label">
                {i + 1}. {s.title}
              </Text>
              <Text variant="small" color={colors.muted}>
                {s.body}
              </Text>
            </View>
          </View>
        ))}
      </Card>

      <Card style={{ gap: 14 }}>
        <Text variant="heading">About you</Text>
        <Field label="Your name" value={name} onChangeText={setName} autoCapitalize="words" autoComplete="name" error={errors.name} />
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoComplete="email"
          placeholder="you@example.com"
          hint="We reply here and use it to find your application."
          error={errors.email}
        />
        <Field
          label="Phone or messaging app (optional)"
          value={contact}
          onChangeText={setContact}
          placeholder="A number, or an app and username"
          hint="Write it the way you'd like us to use it."
        />
      </Card>

      <Card style={{ gap: 14 }}>
        <Text variant="heading">Your events</Text>
        <Field
          label="Group, business or team name"
          value={organization}
          onChangeText={setOrganization}
          autoCapitalize="words"
          placeholder="What buyers will see"
          error={errors.organization}
        />
        <Select label="What will you run?" value={kind} options={eventKinds} onChange={setKind} />
        <View style={{ gap: 8 }}>
          <Text variant="label" color={colors.muted}>
            Tell us about your events
          </Text>
          <TextInput
            accessibilityLabel="Tell us about your events"
            value={about}
            onChangeText={setAbout}
            multiline
            numberOfLines={4}
            placeholder="What you organize, who comes, and how often."
            placeholderTextColor={colors.dim}
            selectionColor={colors.gold}
            onFocus={() => setAboutFocus(true)}
            onBlur={() => setAboutFocus(false)}
            style={{
              minHeight: 110,
              borderWidth: 1,
              borderRadius: radius.md,
              borderColor: errors.about ? colors.danger : aboutFocus ? colors.gold : colors.line,
              backgroundColor: colors.surface2,
              padding: 14,
              color: colors.text,
              fontFamily: fonts.regular,
              fontSize: 15,
              textAlignVertical: "top",
            }}
          />
          {errors.about && (
            <Text variant="small" color={colors.danger}>
              {errors.about}
            </Text>
          )}
        </View>
        <Field label="Website or social page (optional)" value={link} onChangeText={setLink} keyboardType="url" placeholder="A page that shows your past events" />
      </Card>

      <Card style={{ gap: 12 }}>
        <Text variant="heading">Supporting documents</Text>
        <Text variant="small" color={colors.muted}>
          Optional. A poster from a past event, a photo of your group, or anything that shows who you are. Up to {MAX_FILES} files, PDF, PNG or JPG, 5 MB each.
        </Text>
        {docs.map((d, i) => (
          <View key={`${d.name}-${i}`} style={{ flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: colors.surface2, padding: 10 }}>
            <Ionicons name="document-text-outline" size={16} color={colors.gold} />
            <Text variant="small" numberOfLines={1} style={{ flex: 1 }}>
              {d.name}
            </Text>
            <Text variant="caption" color={colors.dim}>
              {formatSize(d.size)}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${d.name}`} hitSlop={10} onPress={() => setDocs(docs.filter((_, j) => j !== i))}>
              <Ionicons name="close" size={18} color={colors.muted} />
            </Pressable>
          </View>
        ))}
        {docs.length < MAX_FILES && (
          <Button title="Attach files" variant="outline" small icon={<Ionicons name="attach" size={16} color={colors.gold} />} onPress={() => void attach()} />
        )}
        {errors.documents && (
          <Text variant="small" color={colors.danger}>
            {errors.documents}
          </Text>
        )}
      </Card>

      <View style={{ gap: 8 }}>
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: terms }} onPress={() => setTerms((t) => !t)} style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: terms ? colors.amber : colors.line, backgroundColor: terms ? colors.amber : colors.surface2, alignItems: "center", justifyContent: "center" }}>
            {terms && <Ionicons name="checkmark" size={14} color={colors.ink} />}
          </View>
          <Text variant="small" color={colors.muted} style={{ flex: 1 }}>
            I agree to the terms and conditions and understand SL Events reviews every application. (Required)
          </Text>
        </Pressable>
        {errors.terms && (
          <Text variant="small" color={colors.danger}>
            {errors.terms}
          </Text>
        )}
      </View>

      {existing && (
        <Card style={{ gap: 8, borderColor: colors.amber + "66", backgroundColor: colors.amber + "14" }}>
          <Text variant="small">There&apos;s already an application for this email that hasn&apos;t been decided yet ({existing.ref}).</Text>
          <Text variant="label" color={colors.amber} accessibilityRole="link" onPress={() => router.push({ pathname: "/become-organizer/status", params: existing })}>
            Check its status
          </Text>
        </Card>
      )}

      <Button title="Send application" onPress={send} />
      <Text variant="small" color={colors.gold} bold center accessibilityRole="link" onPress={() => router.push("/become-organizer/status")}>
        Already applied? Check your application
      </Text>
    </Screen>
  );
}
