import { useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { contactChannels, faqs, helpCategories, type FaqCategory } from "@core/content";
import { submitSupportRequest } from "@core/supportRequests";
import { paymentAccount } from "@core/data";
import { useSession } from "@/lib/hooks";
import { openUrl } from "@/lib/rules";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Field } from "@/ui/Field";
import { Screen } from "@/ui/Screen";
import { Select } from "@/ui/Select";
import { Text } from "@/ui/Text";
import { colors, radius } from "@/theme";

const channelIcons: Record<string, keyof typeof Ionicons.glyphMap> = { mail: "mail-outline", message: "chatbubble-outline", phone: "call-outline", clock: "time-outline" };
const topics = ["Payment", "My tickets", "Account", "Organizing an event", "Something else"];

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((o) => !o)} style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Text bold style={{ flex: 1 }}>
          {q}
        </Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={colors.dim} />
      </View>
      {open && (
        <Text variant="small" color={colors.muted} style={{ marginTop: 8 }}>
          {a}
        </Text>
      )}
    </Pressable>
  );
}

export default function Help() {
  const user = useSession();
  const [cat, setCat] = useState<FaqCategory>("booking");
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<{ topic?: string; message?: string }>({});
  const [sent, setSent] = useState(false);

  function send() {
    const found: typeof errors = {};
    if (!topic) found.topic = "Choose a topic.";
    if (message.trim().length < 10) found.message = "Tell us a little more (at least 10 characters).";
    setErrors(found);
    if (Object.keys(found).length || !user) return;
    // TODO: send the request through the API; the support team replies by email.
    submitSupportRequest({ email: user.email, topic, booking: "", message: message.trim() });
    setSent(true);
    setMessage("");
  }

  return (
    <Screen>
      <Text variant="display">How can we help?</Text>

      <Card style={{ gap: 6 }}>
        <Text variant="heading">How payment works</Text>
        <Text variant="small" color={colors.muted}>
          1. Book your tickets. 2. Transfer the exact amount to {paymentAccount.bank} {paymentAccount.number} ({paymentAccount.holder}), with your booking number in the memo. 3. Upload a screenshot. 4. We check it, usually within 2–6 hours, and your QR tickets appear.
        </Text>
      </Card>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {helpCategories.map((c) => (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            accessibilityState={{ selected: cat === c.id }}
            onPress={() => setCat(c.id)}
            style={{ paddingHorizontal: 14, height: 36, borderRadius: radius.pill, borderWidth: 1, alignItems: "center", justifyContent: "center", borderColor: cat === c.id ? colors.gold : colors.line, backgroundColor: cat === c.id ? colors.gold + "22" : colors.surface }}
          >
            <Text variant="label" color={cat === c.id ? colors.gold : colors.muted}>
              {c.title}
            </Text>
          </Pressable>
        ))}
      </View>
      <View>
        {faqs
          .filter((f) => f.cat === cat)
          .map((f) => (
            <Faq key={f.q} q={f.q} a={f.a} />
          ))}
      </View>

      <Text variant="heading">Contact us</Text>
      <Card style={{ paddingVertical: 4 }}>
        {contactChannels.map((c, i) => {
          const url = c.id === "email" ? `mailto:${c.value}` : c.id === "phone" ? `tel:${c.value.replace(/[^\d+]/g, "")}` : undefined;
          return (
            <Pressable key={c.id} accessibilityRole={url ? "link" : "text"} disabled={!url} onPress={() => url && openUrl(url)} style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.line }}>
              <Ionicons name={channelIcons[c.icon] ?? "help-circle-outline"} size={20} color={colors.gold} />
              <View style={{ flex: 1 }}>
                <Text variant="caption" color={colors.dim}>
                  {c.label}
                </Text>
                <Text bold>{c.value}</Text>
              </View>
            </Pressable>
          );
        })}
      </Card>

      {user && (
        <Card style={{ gap: 14 }}>
          <Text variant="heading">Send us a message</Text>
          {sent ? (
            <View accessibilityRole="alert" style={{ flexDirection: "row", gap: 10 }}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={{ flex: 1 }}>Thanks, we got your message. We reply by email, usually within a day.</Text>
            </View>
          ) : (
            <>
              <Select label="Topic" value={topic} options={topics} onChange={setTopic} error={errors.topic} />
              <Field label="Message" value={message} onChangeText={setMessage} error={errors.message} multiline numberOfLines={4} textAlignVertical="top" style={{ height: 100, paddingTop: 12 }} autoCapitalize="sentences" />
              <Button title="Send" small onPress={send} />
            </>
          )}
        </Card>
      )}
    </Screen>
  );
}
