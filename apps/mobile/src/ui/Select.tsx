import { useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius } from "@/theme";
import { Text } from "./Text";

type Props = { label: string; value: string; options: string[]; onChange: (v: string) => void; placeholder?: string; error?: string };

/** The app's dropdown: a field that opens a dark bottom sheet with the options, instead of the system picker. */
export function Select({ label, value, options, onChange, placeholder = "Choose", error }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Text variant="label" color={colors.muted}>
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || placeholder}`}
        onPress={() => setOpen(true)}
        style={[styles.box, { borderColor: error ? colors.danger : colors.line }]}
      >
        <Text color={value ? colors.text : colors.dim} style={{ flex: 1 }}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.dim} />
      </Pressable>
      {error && (
        <Text variant="small" color={colors.danger}>
          {error}
        </Text>
      )}
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Close" />
        <View style={styles.sheet}>
          <Text variant="heading" style={{ marginBottom: 8 }}>
            {label}
          </Text>
          <FlatList
            data={options}
            keyExtractor={(o) => o}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: item === value }}
                onPress={() => {
                  onChange(item);
                  setOpen(false);
                }}
                style={styles.option}
              >
                <Text color={item === value ? colors.gold : colors.text} bold={item === value}>
                  {item}
                </Text>
                {item === value && <Ionicons name="checkmark" size={18} color={colors.gold} />}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: "row", alignItems: "center", height: 52, borderWidth: 1, borderRadius: radius.md, backgroundColor: colors.surface, paddingHorizontal: 16 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "60%", borderColor: colors.line, borderWidth: 1 },
  option: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth },
});
