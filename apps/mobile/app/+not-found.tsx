import { router } from "expo-router";
import { EmptyState } from "@/ui/EmptyState";
import { Screen } from "@/ui/Screen";

export default function NotFound() {
  return (
    <Screen>
      <EmptyState icon="compass-outline" title="This page does not exist" body="The link may be old or mistyped." action="Go home" onAction={() => router.replace("/")} />
    </Screen>
  );
}
