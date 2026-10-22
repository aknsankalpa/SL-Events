import { useState } from "react";
import { Image, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { customerCan } from "@core/bookings";
import { customerActions } from "@core/bookingStore";
import { banks } from "@core/data";
import { formatKrw } from "@core/format";
import { useBooking, useSession } from "@/lib/hooks";
import { Button } from "@/ui/Button";
import { Card, Row } from "@/ui/Card";
import { EmptyState } from "@/ui/EmptyState";
import { Field } from "@/ui/Field";
import { Screen } from "@/ui/Screen";
import { Select } from "@/ui/Select";
import { SignInPrompt } from "@/ui/SignInPrompt";
import { Text } from "@/ui/Text";
import { colors, radius } from "@/theme";

const MAX_BYTES = 10 * 1024 * 1024;

type Picked = { uri: string; name: string; size?: number };

export default function Proof() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useSession();
  const booking = useBooking(id);
  const [file, setFile] = useState<Picked>();
  const [fileError, setFileError] = useState<string>();
  const [sender, setSender] = useState((user?.name ?? "").toUpperCase());
  const [bank, setBank] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!user) {
    return (
      <Screen>
        <SignInPrompt icon="cloud-upload-outline" title="Log in to upload proof" body="Only the account that made the booking can upload payment proof." />
      </Screen>
    );
  }
  if (!booking) {
    return (
      <Screen>
        <EmptyState icon="receipt-outline" title="Booking not found" body="It may belong to another account." action="My tickets" onAction={() => router.replace("/tickets")} />
      </Screen>
    );
  }
  if (!customerCan.uploadProof(booking)) {
    return (
      <Screen>
        <EmptyState icon="information-circle-outline" title="No proof needed" body="This booking is not waiting for a payment proof." action="Back to booking" onAction={() => router.replace(`/booking/${booking.id}` as never)} />
      </Screen>
    );
  }

  function accept(result: ImagePicker.ImagePickerResult) {
    if (result.canceled) return;
    const a = result.assets[0];
    if (!a) return;
    if (a.fileSize && a.fileSize > MAX_BYTES) return setFileError("That file is larger than 10 MB.");
    setFileError(undefined);
    setFile({ uri: a.uri, name: a.fileName ?? "transfer-receipt.jpg", size: a.fileSize });
  }

  async function fromLibrary() {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    accept(r);
  }

  async function fromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return setFileError("Allow camera access in Settings to take a photo, or choose one from your photos.");
    accept(await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 }));
  }

  function submit() {
    setSubmitted(true);
    if (!file || !sender.trim() || !booking) return;
    // TODO: upload the receipt to storage and send the details to the API. The booking only becomes "under review":
    // it is marked paid when staff have checked the transfer, never from here.
    const ok = customerActions.submitProof(booking.id, {
      fileName: file.name,
      sizeLabel: file.size ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : "—",
      sender: sender.trim(),
      bank,
    });
    router.replace(ok ? (`/booking/${booking.id}` as never) : "/tickets");
  }

  return (
    <Screen>
      <Card>
        <Row label="Booking" value={booking.id} />
        <Row label="Amount to pay" value={formatKrw(booking.total)} strong />
      </Card>

      <View style={{ gap: 10 }}>
        <Text variant="label" color={colors.muted}>
          Screenshot of your transfer
        </Text>
        {file ? (
          <Card style={{ gap: 12 }}>
            <Image source={{ uri: file.uri }} accessibilityLabel="Your transfer screenshot" style={{ width: "100%", height: 220, borderRadius: radius.md, backgroundColor: colors.surface2 }} resizeMode="contain" />
            <Text variant="small" color={colors.muted} numberOfLines={1}>
              {file.name}
            </Text>
            <Button title="Choose a different image" variant="outline" small onPress={fromLibrary} />
          </Card>
        ) : (
          <View style={{ gap: 10 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose a screenshot from your photos"
              onPress={fromLibrary}
              style={{ alignItems: "center", gap: 8, paddingVertical: 28, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: "dashed", borderColor: submitted && !file ? colors.danger : colors.line, backgroundColor: colors.surface }}
            >
              <Ionicons name="cloud-upload-outline" size={30} color={colors.gold} />
              <Text bold>Choose from photos</Text>
              <Text variant="small" color={colors.dim}>
                JPG or PNG, up to 10 MB
              </Text>
            </Pressable>
            <Button title="Take a photo" variant="outline" small icon={<Ionicons name="camera-outline" size={16} color={colors.gold} />} onPress={fromCamera} />
          </View>
        )}
        {(fileError || (submitted && !file)) && (
          <Text variant="small" color={colors.danger} accessibilityRole="alert">
            {fileError ?? "Add a screenshot of your transfer."}
          </Text>
        )}
      </View>

      <Field label="Name on the transfer" value={sender} onChangeText={setSender} autoCapitalize="characters" error={submitted && !sender.trim() ? "Enter the sender name." : undefined} />
      <Select label="Your bank (optional)" value={bank} options={banks} onChange={setBank} placeholder="Choose your bank" />

      <Button title="Send for checking" onPress={submit} />
      <Text variant="small" color={colors.dim} center>
        Sending proof does not confirm your tickets. Our team checks the transfer first.
      </Text>
    </Screen>
  );
}
