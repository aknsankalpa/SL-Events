import { Text as RNText, type TextProps, type TextStyle } from "react-native";
import { colors, fonts } from "@/theme";

type Variant = "display" | "title" | "heading" | "body" | "small" | "caption" | "label";

const variants: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, letterSpacing: 0.5 },
  title: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28 },
  heading: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21 },
  small: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },
  caption: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 15 },
  label: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16 },
};

type Props = TextProps & { variant?: Variant; color?: string; bold?: boolean; center?: boolean };

/** All text goes through here so fonts, sizes and the dark theme's colours stay consistent. */
export function Text({ variant = "body", color = colors.text, bold, center, style, ...rest }: Props) {
  return <RNText {...rest} style={[variants[variant], { color }, bold && { fontFamily: fonts.bold }, center && { textAlign: "center" }, style]} />;
}
