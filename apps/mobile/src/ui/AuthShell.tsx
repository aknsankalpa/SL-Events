import { Image, KeyboardAvoidingView, Platform, View } from "react-native";
import { Screen } from "./Screen";
import { Text } from "./Text";
import { colors } from "@/theme";

/** Logo, title and a short line, then the form. Shared by log in, register, verify and forgot password. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.page }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen style={{ gap: 20 }}>
        <View style={{ alignItems: "center", marginTop: 4 }}>
          <Image source={require("../../assets/logo.jpg")} style={{ width: 150, height: 64 }} resizeMode="contain" accessibilityLabel="SL Events" />
        </View>
        <View style={{ gap: 8 }}>
          <Text variant="display">{title}</Text>
          {subtitle && <Text color={colors.muted}>{subtitle}</Text>}
        </View>
        {children}
      </Screen>
    </KeyboardAvoidingView>
  );
}
