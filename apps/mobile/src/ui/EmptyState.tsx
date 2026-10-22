import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme";
import { Button } from "./Button";
import { Text } from "./Text";

type Props = { icon: keyof typeof Ionicons.glyphMap; title: string; body: string; action?: string; onAction?: () => void };

export function EmptyState({ icon, title, body, action, onAction }: Props) {
  return (
    <View style={{ alignItems: "center", gap: 12, paddingVertical: 48, paddingHorizontal: 24 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={28} color={colors.gold} />
      </View>
      <Text variant="heading" center>
        {title}
      </Text>
      <Text color={colors.muted} center>
        {body}
      </Text>
      {action && onAction && <Button title={action} onPress={onAction} small style={{ marginTop: 8 }} />}
    </View>
  );
}
