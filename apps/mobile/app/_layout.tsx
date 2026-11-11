import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Montserrat_400Regular, Montserrat_500Medium, Montserrat_700Bold, useFonts } from "@expo-google-fonts/montserrat";
import { Cinzel_700Bold } from "@expo-google-fonts/cinzel";
import { refreshAccount } from "@/lib/account";
import { prepareStorage } from "@/lib/storage";
import { fitWebViewport } from "@/lib/webViewport";
import { SplashScreen } from "@/ui/SplashScreen";
import { colors, fonts } from "@/theme";

// In the browser preview, keep the page to the visible screen so the tab bar is never hidden behind the browser toolbar.
fitWebViewport();

export default function RootLayout() {
  const [fontsReady] = useFonts({ Montserrat_400Regular, Montserrat_500Medium, Montserrat_700Bold, Cinzel_700Bold });
  const [storageReady, setStorageReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const hideSplash = useCallback(() => setSplashDone(true), []);

  // The saved sign-in token is read synchronously by the stores, so load it before the first screen; then ask the
  // website who it belongs to, so signed-in screens don't flash "Log in" first. A slow connection waits at most a few
  // seconds: the answer still arrives later and the screens update.
  useEffect(() => {
    void prepareStorage()
      .then(() => Promise.race([refreshAccount(), new Promise((r) => setTimeout(r, 4000))]))
      .then(() => setStorageReady(true));
  }, []);

  if (!fontsReady || !storageReady) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.page },
          headerTintColor: colors.gold,
          headerTitleStyle: { fontFamily: fonts.bold, color: colors.text, fontSize: 16 },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: "minimal",
          contentStyle: { backgroundColor: colors.page },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="staff" options={{ headerShown: false }} />
        <Stack.Screen name="organizer" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: "Log in" }} />
        <Stack.Screen name="register" options={{ title: "Create account" }} />
        <Stack.Screen name="verify" options={{ title: "Verify email" }} />
        <Stack.Screen name="forgot" options={{ title: "Forgot password" }} />
        <Stack.Screen name="event/[slug]" options={{ title: "Event" }} />
        <Stack.Screen name="book/[slug]" options={{ title: "Book tickets" }} />
        <Stack.Screen name="booking/[id]/index" options={{ title: "Booking" }} />
        <Stack.Screen name="booking/[id]/proof" options={{ title: "Upload proof" }} />
        <Stack.Screen name="booking/[id]/tickets" options={{ title: "Your tickets" }} />
        <Stack.Screen name="become-organizer/index" options={{ title: "Become an organizer" }} />
        <Stack.Screen name="become-organizer/status" options={{ title: "Application status" }} />
        <Stack.Screen name="help" options={{ title: "Help" }} />
        <Stack.Screen name="scanner" options={{ title: "Ticket scanner" }} />
        <Stack.Screen name="+not-found" options={{ title: "Not found" }} />
      </Stack>
    </SafeAreaProvider>
      {/* Drawn over the app, which loads underneath; fades away after a moment. */}
      {!splashDone && <SplashScreen onDone={hideSplash} />}
    </View>
  );
}
