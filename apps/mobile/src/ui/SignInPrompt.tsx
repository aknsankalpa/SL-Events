import { View } from "react-native";
import { router, usePathname } from "expo-router";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";
import type { Ionicons } from "@expo/vector-icons";

/** Shown instead of a customer-only screen when nobody is signed in. After logging in they come straight back. */
export function SignInPrompt({ icon, title, body }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }) {
  const path = usePathname();
  return (
    <View style={{ gap: 12 }}>
      <EmptyState icon={icon} title={title} body={body} />
      <Button title="Log in" onPress={() => router.push({ pathname: "/login", params: { next: path } })} />
      <Button title="Create an account" variant="outline" onPress={() => router.push({ pathname: "/register", params: { next: path } })} />
    </View>
  );
}
