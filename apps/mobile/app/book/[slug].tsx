import { useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { customerActions } from "@core/bookingStore";
import { getEvent, ticketsLeft } from "@core/data";
import { formatKrw } from "@core/format";
import { useSession } from "@/lib/hooks";
import { BOOKING_FEE, MAX_TICKETS } from "@/lib/rules";
import { Button } from "@/ui/Button";
import { Card, Row } from "@/ui/Card";
import { EmptyState } from "@/ui/EmptyState";
import { Field } from "@/ui/Field";
import { Screen } from "@/ui/Screen";
import { SignInPrompt } from "@/ui/SignInPrompt";
import { StickyBar } from "@/ui/StickyBar";
import { Text } from "@/ui/Text";
import { colors } from "@/theme";

function Stepper({ label, qty, canAdd, onChange }: { label: string; qty: number; canAdd: boolean; onChange: (delta: number) => void }) {
  const btn = (name: "remove" | "add", on: boolean, delta: number, a11y: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled: !on }}
      disabled={!on}
      onPress={() => onChange(delta)}
      style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: on ? colors.gold + "99" : colors.line, alignItems: "center", justifyContent: "center", opacity: on ? 1 : 0.4 }}
    >
      <Ionicons name={name} size={18} color={colors.gold} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
      {btn("remove", qty > 0, -1, `Remove one ${label} ticket`)}
      <Text accessibilityLiveRegion="polite" bold style={{ minWidth: 22, textAlign: "center" }}>
        {qty}
      </Text>
      {btn("add", canAdd, 1, `Add one ${label} ticket`)}
    </View>
  );
}

export default function Book() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const event = getEvent(slug);
  const user = useSession();

  // Start with two tickets of the first type that has them, like the website.
  const [qty, setQty] = useState<Record<string, number>>(() => {
    const first = event?.ticketTypes.find((t) => ticketsLeft(t) >= 2);
    return first ? { [first.id]: 2 } : {};
  });
  const [step, setStep] = useState<"tickets" | "review">("tickets");
  const [names, setNames] = useState<string[]>([]);
  const [terms, setTerms] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  if (!event) {
    return (
      <Screen>
        <EmptyState icon="calendar-outline" title="We could not find that event" body="It may have ended or the link is wrong." action="Browse events" onAction={() => router.replace("/events")} />
      </Screen>
    );
  }
  if (!user) {
    return (
      <Screen>
        <SignInPrompt icon="ticket-outline" title="Log in to book" body="You need an account so your tickets are saved to you." />
      </Screen>
    );
  }

  const selection = event.ticketTypes.filter((t) => (qty[t.id] ?? 0) > 0).map((t) => ({ type: t, qty: qty[t.id]! }));
  const count = selection.reduce((n, s) => n + s.qty, 0);
  const subtotal = selection.reduce((n, s) => n + s.type.price * s.qty, 0);
  const total = subtotal + BOOKING_FEE;
  const slots = selection.flatMap(({ type, qty: q }) => Array.from({ length: q }, (_, i) => `${type.name} ${i + 1}`));
  const nameAt = (i: number) => names[i] ?? (i === 0 ? user.name : "");
  const missing = slots.some((_, i) => !nameAt(i).trim());

  function change(id: string, delta: number, left: number) {
    setQty((prev) => {
      const next = Math.max(0, Math.min(left, (prev[id] ?? 0) + delta));
      const sum = Object.entries({ ...prev, [id]: next }).reduce((n, [, q]) => n + q, 0);
      return sum > MAX_TICKETS ? prev : { ...prev, [id]: next };
    });
  }

  function confirm() {
    setSubmitted(true);
    if (!terms || missing || !user) return;
    // TODO: POST the booking to the API, which re-checks availability and limits, then use the id it returns.
    // The booking starts unpaid (or confirmed when there is nothing to pay). It is marked paid only by staff.
    const booking = customerActions.createBooking({
      ownerEmail: user.email,
      eventSlug: event!.slug,
      eventTitle: event!.title,
      eventDate: event!.longDate.replace(/^\w+, /, ""),
      lines: selection.map(({ type, qty: q }) => ({ ticketName: type.name, qty: q, unitPrice: type.price })),
      fee: BOOKING_FEE,
      attendees: slots.map((_, i) => nameAt(i).trim()),
    });
    router.replace(`/booking/${booking.id}` as never);
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen bottom={110}>
        <View style={{ gap: 4 }}>
          <Text variant="small" color={colors.gold} bold>
            Step {step === "tickets" ? 1 : 2} of 2
          </Text>
          <Text variant="title">{event.title}</Text>
          <Text variant="small" color={colors.muted}>
            {event.dateLabel} · {event.venue}
          </Text>
        </View>

        {step === "tickets" ? (
          <>
            {event.ticketTypes.map((t) => {
              const left = ticketsLeft(t);
              const q = qty[t.id] ?? 0;
              return (
                <Card key={t.id} style={{ gap: 12, opacity: left === 0 ? 0.6 : 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="heading">{t.name}</Text>
                      <Text variant="small" color={colors.muted}>
                        {t.summary ?? t.perks[0] ?? ""}
                      </Text>
                    </View>
                    <Text variant="heading" color={colors.gold}>
                      {t.price === 0 ? "Free" : formatKrw(t.price)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text variant="caption" color={left === 0 ? colors.danger : colors.dim}>
                      {left === 0 ? "Sold out" : `${left} left · up to ${Math.min(left, MAX_TICKETS)} per booking`}
                    </Text>
                    <Stepper label={t.name} qty={q} canAdd={q < left && count < MAX_TICKETS} onChange={(d) => change(t.id, d, left)} />
                  </View>
                </Card>
              );
            })}
            <Text variant="small" color={count >= MAX_TICKETS ? colors.warning : colors.dim} accessibilityLiveRegion="polite">
              {count >= MAX_TICKETS ? `You can book up to ${MAX_TICKETS} tickets at a time.` : `Up to ${MAX_TICKETS} tickets per booking.`}
            </Text>
          </>
        ) : (
          <>
            <Card style={{ gap: 14 }}>
              <Text variant="heading">Who is coming?</Text>
              <Text variant="small" color={colors.muted}>
                Enter the name for each ticket. It must match the ID shown at the door.
              </Text>
              {slots.map((label, i) => (
                <Field key={label} label={`Ticket ${i + 1} · ${label.replace(/ \d+$/, "")}`} value={nameAt(i)} onChangeText={(v) => setNames((cur) => { const next = slots.map((_, j) => cur[j] ?? (j === 0 ? user.name : "")); next[i] = v; return next; })} autoCapitalize="words" error={submitted && !nameAt(i).trim() ? "Enter the name for this ticket." : undefined} />
              ))}
            </Card>

            <Card>
              <Text variant="heading" style={{ marginBottom: 6 }}>
                Order summary
              </Text>
              {selection.map(({ type, qty: q }) => (
                <Row key={type.id} label={`${q} × ${type.name}`} value={formatKrw(q * type.price)} />
              ))}
              <Row label="Booking fee" value={formatKrw(BOOKING_FEE)} />
              <View style={{ height: 1, backgroundColor: colors.line, marginVertical: 6 }} />
              <Row label="Total" value={formatKrw(total)} strong />
            </Card>

            <Card style={{ gap: 6 }}>
              <Text variant="heading">How you pay</Text>
              <Text variant="small" color={colors.muted}>
                {total === 0
                  ? "This booking is free. Your tickets are confirmed straight away."
                  : "By bank transfer. After you book, we show the account to pay and you upload a screenshot. Your tickets are held for 24 hours."}
              </Text>
            </Card>

            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: terms }} onPress={() => setTerms((t) => !t)} style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
              <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: terms ? colors.amber : colors.line, backgroundColor: terms ? colors.amber : colors.surface2, alignItems: "center", justifyContent: "center" }}>
                {terms && <Ionicons name="checkmark" size={14} color={colors.ink} />}
              </View>
              <Text variant="small" color={colors.muted} style={{ flex: 1 }}>
                I accept the terms, and that tickets are valid only after my payment is confirmed.
              </Text>
            </Pressable>
            {submitted && !terms && (
              <Text variant="small" color={colors.danger}>
                You need to accept the terms to continue.
              </Text>
            )}
          </>
        )}
      </Screen>
      <StickyBar>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <View>
            <Text variant="caption" color={colors.dim}>
              {count} {count === 1 ? "ticket" : "tickets"}
            </Text>
            <Text variant="heading">{formatKrw(total)}</Text>
          </View>
          {step === "tickets" ? (
            <Button title="Continue" disabled={count === 0} onPress={() => setStep("review")} style={{ flex: 1 }} />
          ) : (
            <View style={{ flex: 1, flexDirection: "row", gap: 10 }}>
              <Button title="Back" variant="outline" onPress={() => setStep("tickets")} style={{ flex: 1 }} />
              <Button title={total === 0 ? "Confirm" : "Place booking"} onPress={confirm} style={{ flex: 2 }} />
            </View>
          )}
        </View>
      </StickyBar>
    </View>
  );
}
