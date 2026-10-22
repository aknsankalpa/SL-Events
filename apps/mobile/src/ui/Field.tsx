import { forwardRef, useState, type ComponentRef } from "react";
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius } from "@/theme";
import { Text } from "./Text";

type Props = TextInputProps & { label: string; error?: string; hint?: string; password?: boolean };

/** A labelled text box. Errors and hints sit underneath; password fields get a show/hide toggle. */
export const Field = forwardRef<ComponentRef<typeof TextInput>, Props>(function Field({ label, error, hint, password, style, ...rest }, ref) {
  const [focus, setFocus] = useState(false);
  const [hidden, setHidden] = useState(true);
  return (
    <View style={{ gap: 8 }}>
      <Text variant="label" color={colors.muted}>
        {label}
      </Text>
      <View style={[styles.box, { borderColor: error ? colors.danger : focus ? colors.gold : colors.line }]}>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={colors.dim}
          selectionColor={colors.gold}
          secureTextEntry={password && hidden}
          autoCapitalize="none"
          {...rest}
          onFocus={(e) => {
            setFocus(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocus(false);
            rest.onBlur?.(e);
          }}
          style={[styles.input, style]}
        />
        {password && (
          <Pressable accessibilityLabel={hidden ? "Show password" : "Hide password"} onPress={() => setHidden((h) => !h)} hitSlop={10}>
            <Ionicons name={hidden ? "eye-outline" : "eye-off-outline"} size={18} color={colors.dim} />
          </Pressable>
        )}
      </View>
      {(error || hint) && (
        <Text variant="small" color={error ? colors.danger : colors.dim} accessibilityLiveRegion="polite">
          {error ?? hint}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  box: { flexDirection: "row", alignItems: "center", height: 52, borderWidth: 1, borderRadius: radius.md, backgroundColor: colors.surface, paddingHorizontal: 16, gap: 8 },
  input: { flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 15, height: "100%" },
});
