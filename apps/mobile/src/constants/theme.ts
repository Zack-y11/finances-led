import { Colors, Spacing, glass, typography } from "@finance/design-tokens";
import { Platform } from "react-native";

export { Colors, Spacing, glass };
export type { ThemeColor } from "@finance/design-tokens";

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: typography.fontSans,
    serif: typography.fontSerif,
    rounded: "system-ui",
    mono: typography.fontMono,
  },
});

export const BottomTabInset = Platform.select({ ios: 68, android: 80 }) ?? 72;
export const MaxContentWidth = 800;
