import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Montserrat_400Regular, Montserrat_500Medium, Montserrat_700Bold, useFonts } from "@expo-google-fonts/montserrat";
import { Cinzel_700Bold } from "@expo-google-fonts/cinzel";
import { prepareStorage } from "@/lib/storage";
import { colors, fonts } from "@/theme";

export default function RootLayout() {
  const [fontsReady] = useFonts({ Montserrat_400Regular, Montserrat_500Medium, Montserrat_700Bold, Cinzel_700Bold });
  const [storageReady, setStorageReady] = useState(false);

  // Saved bookings and the session are read synchronously by the shared stores, so load them before the first screen.
  useEffect(() => {
    void prepareStorage().then(() => setStorageReady(true));
  }, []);

  if (!fontsReady || !storageReady) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.page, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
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
        <Stack.Screen name="login" options={{ title: "Log in" }} />
        <Stack.Screen name="register" options={{ title: "Create account" }} />
        <Stack.Screen name="verify" options={{ title: "Verify email" }} />
        <Stack.Screen name="forgot" options={{ title: "Forgot password" }} />
        <Stack.Screen name="event/[slug]" options={{ title: "Event" }} />
        <Stack.Screen name="book/[slug]" options={{ title: "Book tickets" }} />
        <Stack.Screen name="booking/[id]/index" options={{ title: "Booking" }} />
        <Stack.Screen name="booking/[id]/proof" options={{ title: "Upload proof" }} />
        <Stack.Screen name="booking/[id]/tickets" options={{ title: "Your tickets" }} />
        <Stack.Screen name="help" options={{ title: "Help" }} />
        <Stack.Screen name="scanner" options={{ title: "Ticket scanner" }} />
        <Stack.Screen name="+not-found" options={{ title: "Not found" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
