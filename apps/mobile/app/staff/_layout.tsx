import { Stack } from "expo-router";
import { colors } from "@/theme";

/** Everything door staff see. The sign-in screen is public; the tabs and result screens check the account themselves. */
export default function StaffLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.page } }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="result" options={{ animation: "fade", gestureEnabled: false }} />
      <Stack.Screen name="account" options={{ presentation: "modal" }} />
    </Stack>
  );
}
